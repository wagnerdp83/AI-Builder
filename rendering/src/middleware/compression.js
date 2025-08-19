import { createBrotliCompress, createGzip } from "zlib";
import { pipeline } from "stream/promises";

const compressionMiddleware = async (req, res, next) => {
  const acceptEncoding = req.headers["accept-encoding"] || "";

  if (acceptEncoding.includes("br")) {
    res.setHeader("Content-Encoding", "br");
    const compress = createBrotliCompress();
    await pipeline(res, compress, res);
  } else if (acceptEncoding.includes("gzip")) {
    res.setHeader("Content-Encoding", "gzip");
    const compress = createGzip();
    await pipeline(res, compress, res);
  }

  next();
};

export default compressionMiddleware;
