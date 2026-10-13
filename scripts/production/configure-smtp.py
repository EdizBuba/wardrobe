#!/usr/bin/env python3
"""Update production SMTP settings interactively without exposing the password."""
import argparse
import getpass
import os
import re
import stat
import tempfile
from pathlib import Path
from urllib.parse import quote


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', required=True)
    parser.add_argument('--port', type=int, default=587)
    parser.add_argument('--user', required=True)
    parser.add_argument('--from-address', required=True)
    args = parser.parse_args()
    if os.geteuid() != 0 or not os.isatty(0):
        raise SystemExit('Run as root in an interactive terminal (ssh -t).')
    if not re.fullmatch(r'[a-zA-Z0-9.-]+', args.host) or not 1 <= args.port <= 65535:
        raise SystemExit('Invalid SMTP host or port.')
    if any(c in args.from_address for c in "\r\n'"):
        raise SystemExit('Invalid sender.')
    target = Path('/opt/containers/wardrobe/.env')
    info = target.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_uid != 0 or stat.S_IMODE(info.st_mode) != 0o600:
        raise SystemExit('Production environment must be a root-owned regular file with mode 0600.')
    password = getpass.getpass('SMTP password/key (hidden): ')
    if not password:
        raise SystemExit('Empty SMTP credential rejected.')
    url = f'smtp://{quote(args.user, safe="")}:{quote(password, safe="")}@{args.host}:{args.port}?requireTLS=true'
    updates = {'SMTP_URL': url, 'EMAIL_FROM': args.from_address}
    lines = [line for line in target.read_text().splitlines() if line.partition('=')[0] not in updates]
    lines.extend(f"{key}='{value}'" for key, value in updates.items())
    fd, temporary = tempfile.mkstemp(prefix='.env-smtp-', dir=target.parent)
    try:
        with os.fdopen(fd, 'w') as output:
            output.write('\n'.join(lines) + '\n')
        os.replace(temporary, target)
    finally:
        Path(temporary).unlink(missing_ok=True)
    print('SMTP configuration saved securely. Recreate the application container to apply it.')


if __name__ == '__main__':
    main()
