import type { MetadataRoute } from "next";
import { product } from "@/config/product";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: product.name,
    short_name: product.name,
    description: product.description,
    start_url: "/today",
    scope: "/",
    display: "standalone",
    background_color: "#f6f5f1",
    theme_color: "#334d40",
    lang: "fr",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
