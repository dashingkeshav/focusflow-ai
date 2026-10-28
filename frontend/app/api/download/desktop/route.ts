import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

function resolveInstallerPath(): string | null {
  const candidatePaths = [
    path.join(process.cwd(), "public", "downloads", "FocusFlow-Setup.exe"),
    path.join(process.cwd(), "frontend", "public", "downloads", "FocusFlow-Setup.exe"),
    path.join(process.cwd(), "release", "FocusFlow-Setup.exe"),
    path.join(process.cwd(), "..", "release", "FocusFlow-Setup.exe"),
    path.join(process.cwd(), "..", "frontend", "public", "downloads", "FocusFlow-Setup.exe"),
  ];

  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
        return candidate;
      }
    } catch {
      // Ignore filesystem permission or path resolution errors on candidates
    }
  }

  return null;
}

/*
 * Always resolve the newest published installer. Pinning a tag here means a
 * later successful release silently keeps serving an outdated build.
 */
const OFFICIAL_RELEASE_DOWNLOAD_URL =
  "https://github.com/dashingkeshav/focusflow-ai/releases/latest/download/FocusFlow-Setup.exe";

function getConfiguredDownloadUrl(): string | null {
  const raw = (process.env.DESKTOP_DOWNLOAD_URL || "").trim();
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") {
      console.error("DESKTOP_DOWNLOAD_URL must use HTTPS; falling back to the GitHub release asset.");
      return null;
    }
    return parsed.toString();
  } catch {
    console.error("DESKTOP_DOWNLOAD_URL is not a valid URL; falling back to the GitHub release asset.");
    return null;
  }
}

export async function HEAD(_request: Request) {
  try {
    const externalUrl = getConfiguredDownloadUrl();
    if (externalUrl) {
      return NextResponse.redirect(externalUrl, 302);
    }

    const filePath = resolveInstallerPath();
    if (!filePath) {
      return NextResponse.redirect(OFFICIAL_RELEASE_DOWNLOAD_URL, 302);
    }

    const stat = await fs.promises.stat(/*turbopackIgnore: true*/ filePath);
    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.microsoft.portable-executable",
        "Content-Disposition": 'attachment; filename="FocusFlow-Setup.exe"',
        "Content-Length": stat.size.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("Error in HEAD for Windows installer:", err);
    return NextResponse.redirect(OFFICIAL_RELEASE_DOWNLOAD_URL, 302);
  }
}

export async function GET(request: Request) {
  try {
    // 1. External release asset redirect (e.g., GitHub Releases or Cloudflare R2 on Vercel)
    const externalUrl = getConfiguredDownloadUrl();
    if (externalUrl) {
      return NextResponse.redirect(externalUrl, 302);
    }

    // 2. Local filesystem resolution if present (e.g. local dev / custom deployment)
    const filePath = resolveInstallerPath();
    if (!filePath) {
      // Gracefully redirect to official GitHub release asset (never return 404 in production)
      return NextResponse.redirect(OFFICIAL_RELEASE_DOWNLOAD_URL, 302);
    }

    const stat = await fs.promises.stat(/*turbopackIgnore: true*/ filePath);
    const fileSize = stat.size;
    const rangeHeader = request.headers.get("range");

    // 3. Support HTTP Range requests for large resumable downloads
    if (rangeHeader && rangeHeader.startsWith("bytes=")) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (!isNaN(start) && start < fileSize && end >= start && end < fileSize) {
        const chunkSize = end - start + 1;
        const nodeStream = fs.createReadStream(/*turbopackIgnore: true*/ filePath, { start, end });
        // Use Node's official Readable.toWeb for backpressure-aware streaming
        const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

        return new Response(webStream, {
          status: 206,
          headers: {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunkSize.toString(),
            "Content-Type": "application/vnd.microsoft.portable-executable",
            "Content-Disposition": 'attachment; filename="FocusFlow-Setup.exe"',
            "Cache-Control": "public, max-age=3600",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    }

    // 4. Full file streaming with backpressure support
    const nodeStream = fs.createReadStream(/*turbopackIgnore: true*/ filePath);
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.microsoft.portable-executable",
        "Content-Disposition": 'attachment; filename="FocusFlow-Setup.exe"',
        "Content-Length": fileSize.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("Error serving Windows installer download:", err);
    return NextResponse.json(
      { error: "Failed to download desktop installer" },
      { status: 500 }
    );
  }
}
