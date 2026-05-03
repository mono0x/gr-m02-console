import { createHash } from "node:crypto"
import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

const here = path.dirname(fileURLToPath(import.meta.url))

// Best-effort mirror of public/_headers for local dev/preview. The canonical headers
// for production are public/_headers; minor drift is acceptable here.
const securityHeaders = {
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy":
    "accelerometer=(), attribution-reporting=(), autoplay=(), bluetooth=(), browsing-topics=(), camera=(), clipboard-read=(), clipboard-write=(), compute-pressure=(), display-capture=(), encrypted-media=(), fullscreen=(), gamepad=(), geolocation=(), gyroscope=(), hid=(), idle-detection=(), interest-cohort=(), join-ad-interest-group=(), local-fonts=(), magnetometer=(), microphone=(), midi=(), otp-credentials=(), payment=(), picture-in-picture=(), publickey-credentials-create=(), publickey-credentials-get=(), run-ad-auction=(), screen-wake-lock=(), serial=(self), shared-storage=(), shared-storage-select-url=(), sync-xhr=(), usb=(), web-share=(), window-management=(), xr-spatial-tracking=()",
}

// dev server omits CSP because HMR needs WebSocket connect-src.
const productionCsp =
  "default-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests"

// Inserts SRI integrity attributes into Vite-emitted <script>, <link rel="stylesheet">,
// and <link rel="modulepreload"> tags. Uses position-based insertion (no tag re-construction)
// so the original markup outside the inserted attribute is preserved verbatim.
function subresourceIntegrity(): Plugin {
  const tagPatterns: Array<{ regex: RegExp; urlGroup: number }> = [
    { regex: /<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g, urlGroup: 1 },
    { regex: /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/g, urlGroup: 1 },
    { regex: /<link\b[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+)"[^>]*>/g, urlGroup: 1 },
  ]

  return {
    name: "subresource-integrity",
    apply: "build",
    enforce: "post",
    generateBundle(_, bundle) {
      const integrity = new Map<string, string>()
      for (const [fileName, item] of Object.entries(bundle)) {
        const source =
          item.type === "chunk"
            ? item.code
            : typeof item.source === "string"
              ? item.source
              : Buffer.from(item.source)
        integrity.set(fileName, `sha384-${createHash("sha384").update(source).digest("base64")}`)
      }

      const inject = (html: string): string => {
        const edits: Array<{ pos: number; text: string }> = []
        for (const { regex, urlGroup } of tagPatterns) {
          for (const match of html.matchAll(regex)) {
            const matched = match[0]
            const url = match[urlGroup]
            if (/\bintegrity=/.test(matched)) continue
            const sri = integrity.get(url.replace(/^\/+/, ""))
            if (!sri) continue
            // Insert before the start tag's closing '>'. Vite-emitted tags never embed '>'
            // inside attribute values, so indexOf(">") locates the start-tag terminator.
            const insertAt = (match.index ?? 0) + matched.indexOf(">")
            const co = /\bcrossorigin\b/.test(matched) ? "" : ' crossorigin="anonymous"'
            edits.push({ pos: insertAt, text: ` integrity="${sri}"${co}` })
          }
        }
        edits.sort((a, b) => b.pos - a.pos)
        for (const { pos, text } of edits) {
          html = html.slice(0, pos) + text + html.slice(pos)
        }
        return html
      }

      for (const item of Object.values(bundle)) {
        if (item.type !== "asset" || !item.fileName.endsWith(".html")) continue
        const html = typeof item.source === "string" ? item.source : item.source.toString()
        item.source = inject(html)
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), subresourceIntegrity()],
  resolve: {
    alias: {
      "@": path.resolve(here, "src"),
    },
  },
  server: {
    port: 5173,
    headers: securityHeaders,
  },
  preview: {
    headers: {
      ...securityHeaders,
      "Content-Security-Policy": productionCsp,
    },
  },
})
