import { OutfitDetail } from "@/modules/outfits/presentation/detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OutfitDetail id={id} />;
}
