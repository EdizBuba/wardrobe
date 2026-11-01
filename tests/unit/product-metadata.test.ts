import { describe, expect, it } from "vitest";
import {
  fallbackMetadata,
  isPrivateAddress,
  parseHttpUrl,
  parseProductMetadata,
} from "@/modules/wardrobe/infrastructure/product-metadata";

describe("product metadata", () => {
  it("reads Open Graph and JSON-LD product data", () => {
    const html = `<!doctype html><html><head>
      <title>Fallback title</title>
      <meta property="og:title" content="Nike Air &amp; Co">
      <meta property="og:image" content="/img/a.jpg">
      <meta property="og:description" content="Une paire simple.">
      <meta property="product:price:amount" content="129.99">
      <meta property="product:price:currency" content="eur">
      <meta property="product:color" content="Noir">
      <script type="application/ld+json">
        {"@type":"Product","brand":{"name":"Nike"},"offers":{"price":"129.99","priceCurrency":"EUR"}}
      </script>
    </head></html>`;

    expect(parseProductMetadata(html, "https://example.com/product/1")).toMatchObject({
      name: "Nike Air & Co",
      brand: "Nike",
      color: "Noir",
      description: "Une paire simple.",
      priceCents: 12999,
      currency: "EUR",
      imageUrl: "https://example.com/img/a.jpg",
    });
  });

  it("reads a ProductGroup variant for image, color and price", () => {
    const html = `<script type="application/ld+json">
      {"@type":"ProductGroup","name":"Tatum 5","brand":{"@type":"Brand","name":"Jordan"},
       "hasVariant":[{"@type":"Product","color":"Bleu",
       "image":"https://cdn.example.com/tatum.png",
       "offers":{"price":"129.99","priceCurrency":"EUR"}}]}
    </script>`;

    expect(parseProductMetadata(html, "https://example.com/")).toMatchObject({
      name: "Tatum 5",
      brand: "Jordan",
      color: "Bleu",
      priceCents: 12999,
      currency: "EUR",
      imageUrl: "https://cdn.example.com/tatum.png",
    });
  });

  it("reads a Product inside an @graph with an image array", () => {
    const html = `<script type="application/ld+json">
      {"@context":"https://schema.org","@graph":[
        {"@type":"Product","name":"Veste","image":["https://cdn.example.com/a.jpg"],
         "color":"Bleu","offers":[{"@type":"Offer","price":"59.90","priceCurrency":"EUR"}]}
      ]}
    </script>`;

    expect(parseProductMetadata(html, "https://example.com/")).toMatchObject({
      name: "Veste",
      color: "Bleu",
      priceCents: 5990,
      currency: "EUR",
      imageUrl: "https://cdn.example.com/a.jpg",
    });
  });
});

describe("blocked product fallback", () => {
  it("derives a name and brand from the URL", () => {
    expect(
      fallbackMetadata(
        "https://www.bershka.com/fr/femme/pull-col-rond-brod%C3%A9-c1010193132p228470439.html",
      ),
    ).toEqual({ name: "Pull col rond brodé", brand: "Bershka" });
    expect(
      fallbackMetadata(
        "https://www.zara.com/fr/fr/pull-col-rond-p01234567.html",
      ),
    ).toEqual({ name: "Pull col rond", brand: "Zara" });
    expect(
      fallbackMetadata(
        "https://www.nike.com/fr/t/chaussure-de-basket-tatum-5-sunrise-KeYydCTe/IO1746-401",
      ),
    ).toEqual({
      name: "Chaussure de basket tatum 5 sunrise",
      brand: "Nike",
    });
  });
});

describe("private address detection", () => {
  it("blocks loopback, private, link-local and reserved addresses", () => {
    for (const address of [
      "127.0.0.1",
      "10.1.2.3",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.1.1",
      "0.0.0.0",
      "::1",
      "fc00::1",
      "fe80::1",
    ])
      expect(isPrivateAddress(address)).toBe(true);
  });

  it("allows public addresses", () => {
    expect(isPrivateAddress("1.1.1.1")).toBe(false);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
    expect(isPrivateAddress("2001:4860:4860::8888")).toBe(false);
  });
});

describe("product URL validation", () => {
  it("rejects non-http, credentials, localhost and private IPs", () => {
    expect(parseHttpUrl("file:///etc/passwd")).toBeNull();
    expect(parseHttpUrl("https://user:pass@example.com/")).toBeNull();
    expect(parseHttpUrl("http://localhost:3000/")).toBeNull();
    expect(parseHttpUrl("http://127.0.0.1/")).toBeNull();
    expect(parseHttpUrl("http://10.0.0.1/")).toBeNull();
  });

  it("accepts a normal product URL", () => {
    expect(parseHttpUrl("https://example.com/product/1")?.hostname).toBe(
      "example.com",
    );
  });
});
