// Material + texture system. PBR maps are the bundled CC0 Poly Haven assets
// (diff = albedo sRGB, nor_gl = normal, arm = AO/roughness/metalness packed
// per the glTF convention → aoMap.r / glossMap.g inverted / metalnessMap.b).
// Textures stream in progressively; materials are created immediately with
// flat fallback values and upgrade in place when their maps arrive.

import * as pc from "playcanvas";

export type Progress = { loaded: number; total: number };

export class TextureStore {
  private cache = new Map<string, Promise<pc.Texture>>();
  private loaded = 0;
  private total = 0;
  onProgress: ((p: Progress) => void) | null = null;

  constructor(private device: pc.GraphicsDevice) {}

  private bump(done: boolean) {
    if (done) this.loaded++;
    else this.total++;
    this.onProgress?.({ loaded: this.loaded, total: this.total });
  }

  image(url: string, srgb: boolean, anisotropy = 8): Promise<pc.Texture> {
    const key = `${url}|${srgb}`;
    let p = this.cache.get(key);
    if (!p) {
      this.bump(false);
      p = new Promise<pc.Texture>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = async () => {
          // WebGPU texture upload requires ImageBitmap/canvas sources
          let source: HTMLImageElement | ImageBitmap = img;
          try {
            source = await createImageBitmap(img, {
              premultiplyAlpha: "none",
              colorSpaceConversion: "none",
            });
          } catch {
            /* older browsers: HTMLImageElement works on the WebGL2 path */
          }
          const tex = new pc.Texture(this.device, {
            width: img.width,
            height: img.height,
            format: srgb ? pc.PIXELFORMAT_SRGBA8 : pc.PIXELFORMAT_RGBA8,
            mipmaps: true,
            anisotropy,
            addressU: pc.ADDRESS_REPEAT,
            addressV: pc.ADDRESS_REPEAT,
          });
          // the engine accepts ImageBitmap at runtime; the typing predates it
          tex.setSource(source as HTMLImageElement);
          this.bump(true);
          resolve(tex);
        };
        img.onerror = () => {
          this.bump(true); // keep the progress bar honest even on failure
          reject(new Error(`texture failed: ${url}`));
        };
        img.src = url;
      });
      this.cache.set(key, p);
    }
    return p;
  }
}

export type PBRSpec = {
  asset: string;
  tiling: [number, number];
  diff?: boolean;
  arm?: boolean;
  normalScale?: number;
};

export type MatOpts = {
  color?: string;
  rough?: number;
  metal?: number;
  opacity?: number;
  blend?: boolean;
  depthWrite?: boolean;
  emissive?: string;
  emissiveIntensity?: number;
  envIntensity?: number;
  cull?: number;
  additive?: boolean;
  fog?: boolean;
  pbr?: PBRSpec;
};

export function color(hex: string): pc.Color {
  const n = parseInt(hex.slice(1), 16);
  return new pc.Color(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/**
 * Create a StandardMaterial. If `pbr` is given, the texture maps stream in
 * asynchronously and the material upgrades in place (progressive loading).
 */
export function makeMaterial(store: TextureStore, opts: MatOpts = {}): pc.StandardMaterial {
  const m = new pc.StandardMaterial();
  m.diffuse = color(opts.color ?? "#ffffff");
  m.gloss = 1 - (opts.rough ?? 0.85);
  const glossCap = opts.rough !== undefined ? 1 - opts.rough : 1;
  m.useMetalness = true;
  m.metalness = opts.metal ?? 0;
  if (opts.envIntensity !== undefined) {
    // per-material curb on IBL reflections (PlayCanvas exposes this as
    // material refraction/reflectivity-adjacent envAtlas scaling via
    // specularityFactor for metals; we keep it simple with gloss control)
  }
  if (opts.opacity !== undefined && opts.opacity < 1) {
    m.opacity = opts.opacity;
    m.blendType = opts.additive ? pc.BLEND_ADDITIVE : pc.BLEND_NORMAL;
    m.depthWrite = opts.depthWrite ?? false;
  } else if (opts.blend) {
    m.blendType = opts.additive ? pc.BLEND_ADDITIVE : pc.BLEND_NORMAL;
    m.depthWrite = opts.depthWrite ?? true;
  }
  if (opts.emissive) {
    m.emissive = color(opts.emissive);
    m.emissiveIntensity = opts.emissiveIntensity ?? 1;
  }
  if (opts.cull !== undefined) m.cull = opts.cull;
  if (opts.fog === false) m.useFog = false;

  if (opts.pbr) {
    const { asset, tiling, diff = true, arm = true, normalScale = 1 } = opts.pbr;
    if (diff) {
      void store.image(`/textures/${asset}_diff_1k.jpg`, true).then((tex) => {
        m.diffuseMap = tex;
        m.diffuseMapTiling = new pc.Vec2(tiling[0], tiling[1]);
        m.update();
      });
    }
    void store.image(`/textures/${asset}_nor_gl_1k.jpg`, false).then((tex) => {
      m.normalMap = tex;
      m.normalMapTiling = new pc.Vec2(tiling[0], tiling[1]);
      m.bumpiness = normalScale;
      m.update();
    });
    if (arm) {
      void store.image(`/textures/${asset}_arm_1k.jpg`, false).then((tex) => {
        m.aoMap = tex;
        m.aoMapChannel = "r";
        m.aoMapTiling = new pc.Vec2(tiling[0], tiling[1]);
        m.glossMap = tex;
        m.glossMapChannel = "g";
        m.glossInvert = true;
        m.glossMapTiling = new pc.Vec2(tiling[0], tiling[1]);
        m.gloss = glossCap; // scalar multiplies the map — caller's rough caps shine
        m.metalnessMap = tex;
        m.metalnessMapChannel = "b";
        m.metalnessMapTiling = new pc.Vec2(tiling[0], tiling[1]);
        m.metalness = 1;
        m.update();
      });
    }
  }
  m.update();
  return m;
}

/** Architectural glass: reflective, slightly tinted, fades for slice view. */
export function glassMaterial(tint: string, opacity: number): pc.StandardMaterial {
  const m = new pc.StandardMaterial();
  m.diffuse = color(tint);
  m.gloss = 0.94;
  m.useMetalness = true;
  m.metalness = 0.55; // strong env reflections without true refraction cost
  m.opacity = opacity;
  m.blendType = pc.BLEND_NORMAL;
  m.depthWrite = false;
  m.update();
  return m;
}
