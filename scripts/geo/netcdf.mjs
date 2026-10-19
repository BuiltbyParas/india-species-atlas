// A reader for the NetCDF classic format, shared by the relief builders (build-relief.mjs, build-region.mjs).

/** A reader for the NetCDF classic format (CDF-1/CDF-2), enough for ERDDAP's grid output. */
export function readNetCdf(buf) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (buf.toString('latin1', 0, 3) !== 'CDF') throw new Error('not a NetCDF classic file');
  const version = buf[3];
  let at = 8; // magic + numrecs
  const u32 = () => {
    const v = view.getUint32(at);
    at += 4;
    return v;
  };
  const name = () => {
    const n = u32();
    const s = buf.toString('utf8', at, at + n);
    at += Math.ceil(n / 4) * 4;
    return s;
  };
  const SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 4, 6: 8 };
  const skipAttributes = () => {
    const tag = u32();
    const count = u32();
    if (tag === 0) return;
    for (let i = 0; i < count; i++) {
      name();
      const type = u32();
      const n = u32();
      at += Math.ceil((n * SIZE[type]) / 4) * 4;
    }
  };
  const dims = [];
  if (u32() === 0x0a) {
    const n = u32();
    for (let i = 0; i < n; i++) dims.push({ name: name(), size: u32() });
  } else u32();
  skipAttributes();
  const vars = {};
  if (u32() === 0x0b) {
    const n = u32();
    for (let i = 0; i < n; i++) {
      const vname = name();
      const ndims = u32();
      const shape = [];
      for (let d = 0; d < ndims; d++) shape.push(dims[u32()].size);
      skipAttributes();
      const type = u32();
      u32(); // vsize
      const begin = version === 2 ? Number(view.getBigUint64((at += 8) - 8)) : u32();
      vars[vname] = { shape, type, begin };
    }
  }
  const read = (vname) => {
    const v = vars[vname];
    const count = v.shape.reduce((a, b) => a * b, 1);
    const out = new Float64Array(count);
    const size = SIZE[v.type];
    for (let i = 0; i < count; i++) {
      const o = v.begin + i * size;
      out[i] = v.type === 6 ? view.getFloat64(o) : v.type === 5 ? view.getFloat32(o) : v.type === 3 ? view.getInt16(o) : view.getInt32(o);
    }
    return { shape: v.shape, data: out };
  };
  return { vars, read };
}
