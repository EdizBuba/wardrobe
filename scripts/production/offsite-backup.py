#!/usr/bin/env python3
"""Download the latest completed VPS snapshot into a protected encrypted PC repository."""
import argparse
import hashlib
import logging
import os
import re
import secrets
import shutil
import subprocess
import tarfile
import tempfile
from datetime import datetime, timezone
from pathlib import Path

FILES = {'database.dump', 'media.tar.gz', 'app-image.txt', 'SHA256SUMS', 'COMPLETE'}


def protect_check(directory):
    if directory.is_symlink() or not directory.is_dir():
        raise RuntimeError('Backup directory must already exist and must not be a symlink.')
    if os.name == 'nt':
        # The path is passed through the environment, never interpolated into shell code.
        code = r'''$ErrorActionPreference='Stop'; $a=Get-Acl -LiteralPath $env:WARDROBE_BACKUP_DIRECTORY;
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value;
$owner=([Security.Principal.NTAccount]$a.Owner).Translate([Security.Principal.SecurityIdentifier]).Value;
if($owner -ne $sid){exit 1}; foreach($r in $a.Access){
if($r.AccessControlType -eq 'Allow' -and $r.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin @($sid,'S-1-5-18')){exit 1}}'''
        windows_env = {key: value for key, value in os.environ.items() if key.upper() != 'PSMODULEPATH'}
        windows_env['WARDROBE_BACKUP_DIRECTORY'] = str(directory)
        result = subprocess.run(['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', code],
                                env=windows_env, capture_output=True)
        if result.returncode:
            raise RuntimeError('Restrict Windows directory permissions to its owner and SYSTEM first.')
    elif directory.stat().st_uid != os.getuid() or directory.stat().st_mode & 0o077:
        raise RuntimeError('Backup directory must belong to the current user with mode 0700.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, required=True)
    parser.add_argument('--restic', type=Path, required=True)
    parser.add_argument('--ssh-host', default='ovh-vps')
    args = parser.parse_args()
    directory = args.directory.absolute()
    protect_check(directory)
    logging.basicConfig(filename=directory / 'backup.log', level=logging.INFO,
                        format='%(asctime)s %(levelname)s %(message)s')
    if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9.-]*', args.ssh_host):
        raise RuntimeError('Use a validated SSH config alias.')
    ssh = ['ssh', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=15', args.ssh_host]
    listing = subprocess.run(ssh + ['sudo -n find /opt/containers/wardrobe/backups -mindepth 2 -maxdepth 2 -name COMPLETE -printf "%h\\n"'], capture_output=True, text=True, check=True)
    paths = sorted(p for p in listing.stdout.splitlines() if re.fullmatch(r'/opt/containers/wardrobe/backups/20[0-9]{6}T[0-9]{6}Z', p))
    if not paths:
        raise RuntimeError('No completed VPS backup found.')
    remote = paths[-1]
    stamp = remote.rsplit('/', 1)[1]
    age = datetime.now(timezone.utc) - datetime.strptime(stamp, '%Y%m%dT%H%M%SZ').replace(tzinfo=timezone.utc)
    if not 0 <= age.total_seconds() <= 26 * 3600:
        raise RuntimeError('Latest VPS backup is older than 26 hours or dated in the future.')
    password = directory / 'restic-password'
    if not password.exists():
        with password.open('x') as output:
            output.write(secrets.token_hex(48) + '\n')
        if os.name != 'nt':
            password.chmod(0o600)
    if password.is_symlink():
        raise RuntimeError('Invalid password-file link.')
    env = {**os.environ, 'RESTIC_REPOSITORY': str(directory / 'repository'), 'RESTIC_PASSWORD_FILE': str(password)}

    def restic(*command):
        result = subprocess.run([str(args.restic.resolve()), *command], env=env, capture_output=True)
        if result.returncode:
            raise RuntimeError('Restic operation failed: ' + command[0] + ' (exit ' + str(result.returncode) + ')')

    marker = directory / 'last-verified-snapshot'
    if marker.exists() and marker.read_text().strip() == stamp:
        print('Latest snapshot already copied and verified: ' + stamp)
        logging.info('Latest snapshot already copied and verified: %s', stamp)
        return
    temporary = Path(tempfile.mkdtemp(prefix='.plaintext-', dir=directory))
    try:
        source = temporary / 'input'
        source.mkdir()
        archive = temporary / 'snapshot.tar'
        with archive.open('wb') as output:
            subprocess.run(ssh + [f'sudo -n tar -C {remote} -cf - .'], stdout=output, stderr=subprocess.PIPE, check=True)
        with tarfile.open(archive) as bundle:
            for member in bundle.getmembers():
                name = member.name.removeprefix('./')
                if not ((name in ('', '.') and member.isdir()) or (name in FILES and member.isfile())):
                    raise RuntimeError('Unexpected archive entry.')
            bundle.extractall(source, filter='data')
        if not (directory / 'repository' / 'config').exists():
            restic('init')
        restic('backup', '--tag', 'wardrobe', str(source))
        restic('check', '--read-data')
        restored = temporary / 'restored'
        subpath = '/' + str(source).replace(':', '').replace('\\', '/') if os.name == 'nt' else str(source)
        restic('restore', 'latest:' + subpath, '--target', str(restored))
        verified = set()
        for line in (restored / 'SHA256SUMS').read_text().splitlines():
            expected, name = line.split(None, 1)
            name = name.lstrip('*')
            if name not in FILES or hashlib.sha256((restored / name).read_bytes()).hexdigest() != expected:
                raise RuntimeError('Restored snapshot hash mismatch.')
            verified.add(name)
        if verified != {'database.dump', 'media.tar.gz', 'app-image.txt'}:
            raise RuntimeError('Incomplete restored manifest.')
        restic('forget', '--tag', 'wardrobe', '--group-by', 'host,tags', '--keep-daily', '7', '--keep-weekly', '4', '--keep-monthly', '3', '--prune')
        marker.write_text(stamp + '\n')
        print('Encrypted off-VPS backup and restored hashes verified: ' + stamp)
        logging.info('Encrypted off-VPS backup and restored hashes verified: %s', stamp)
    finally:
        # This generated temporary path must remain inside the explicit protected directory.
        resolved = temporary.resolve()
        if resolved.parent != directory.resolve() or not resolved.name.startswith('.plaintext-') or temporary.is_symlink():
            raise RuntimeError('Unsafe temporary cleanup path; refusing deletion.')
        shutil.rmtree(resolved)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Never dump subprocess buffers, SMTP credentials, database contents or keys.
        print('Offsite backup failed: ' + (str(error) if isinstance(error, RuntimeError) else type(error).__name__))
        logging.error('Offsite backup failed: %s', str(error) if isinstance(error, RuntimeError) else type(error).__name__)
        raise SystemExit(1)
