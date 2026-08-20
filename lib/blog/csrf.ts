export class BlogCsrfError extends Error {
  readonly status = 403;

  constructor(message = "请求来源无效") {
    super(message);
    this.name = "BlogCsrfError";
  }
}

export function assertSameOrigin(request: Request): void {
  const targetOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin) {
    let sourceOrigin: string;
    try {
      sourceOrigin = new URL(origin).origin;
    } catch {
      throw new BlogCsrfError();
    }
    if (sourceOrigin !== targetOrigin) throw new BlogCsrfError();
    return;
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== "same-origin" && fetchSite !== "none") throw new BlogCsrfError();
}
