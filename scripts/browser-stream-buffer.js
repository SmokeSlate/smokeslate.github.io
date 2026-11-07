import { Buffer } from 'buffer';
class WritableStreamBuffer {
  constructor() { this.chunks = []; this.length = 0; }
  write(value) { const bytes = Buffer.from(value); this.chunks.push(bytes); this.length += bytes.length; }
  size() { return this.length; }
  getContents() { return Buffer.concat(this.chunks, this.length); }
}
export default { WritableStreamBuffer };
