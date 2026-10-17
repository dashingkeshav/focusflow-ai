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

export async function HEAD(request: Request) {
  try {
    const externalUrl = process.env.DESKTOP_DOWNLOAD_URL || process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL;
    if (externalUrl && externalUrl.startsWith("https://")) {
      return NextResponse.redirect(externalUrl, 302);
    }

    const filePath = resolveInstallerPath();
    if (!filePath) {
      return NextResponse.json(
        { error: "Windows desktop installer not found" },
        { status: 404 }
      );
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
    return NextResponse.json({ error: "Failed to query desktop installer" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    // 1. External release asset redirect (e.g., GitHub Releases or Cloudflare R2 on Vercel)
    const externalUrl = process.env.DESKTOP_DOWNLOAD_URL || process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL;
    if (externalUrl && externalUrl.startsWith("https://")) {
      return NextResponse.redirect(externalUrl, 302);
    }

    // 2. Local filesystem resolution
    const filePath = resolveInstallerPath();
    if (!filePath) {
      return NextResponse.json(
        {
          error: "Windows desktop installer not found",
          message: "Please ensure release/FocusFlow-Setup.exe or public/downloads/FocusFlow-Setup.exe exists.",
        },
        { status: 404 }
      );
    }

    const stat = await fs.promises.stat(/*turbopackIgnore: true*/ filePath);
    const fileSize = stat.size;
    const rangeHeader = request.headers.get("range");

    // 3. Support HTTP Range requests (crucial for 94+ MB downloads and resumable transfer)
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
