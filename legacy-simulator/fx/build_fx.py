"""Generate engine-ready Pocket-Tanks-style VFX textures with real alpha."""
from __future__ import annotations

import math
import os
import random
from PIL import Image, ImageFilter

OUT = os.path.dirname(os.path.abspath(__file__))
rng = random.Random(42)


def clamp(v, lo=0.0, hi=1.0):
    return lo if v < lo else hi if v > hi else v


def lerp(a, b, t):
    return a + (b - a) * t


def smooth(t):
    return t * t * (3.0 - 2.0 * t)


def hash2(ix, iy, seed=0):
    n = (ix * 374761393 + iy * 668265263 + seed * 1442695041) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return (n & 0xFFFFFF) / 16777215.0


def value_noise(x, y, seed=0):
    x0 = math.floor(x)
    y0 = math.floor(y)
    fx = smooth(x - x0)
    fy = smooth(y - y0)
    v00 = hash2(x0, y0, seed)
    v10 = hash2(x0 + 1, y0, seed)
    v01 = hash2(x0, y0 + 1, seed)
    v11 = hash2(x0 + 1, y0 + 1, seed)
    return lerp(lerp(v00, v10, fx), lerp(v01, v11, fx), fy)


def fbm(x, y, octaves=4, seed=0):
    amp = 1.0
    freq = 1.0
    total = 0.0
    norm = 0.0
    for i in range(octaves):
        total += value_noise(x * freq, y * freq, seed + i * 19) * amp
        norm += amp
        amp *= 0.5
        freq *= 2.05
    return total / norm


def new_img(w, h):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def write_pixels(img, fn):
    w, h = img.size
    px = img.load()
    for y in range(h):
        for x in range(w):
            px[x, y] = fn(x, y, w, h)
    return img


def soft_blob(size, inner, outer, hardness=0.22, noise_amt=0.12, seed=1, stretch_y=1.0):
    """Soft circular particle. inner/outer are (r,g,b) 0-255."""

    def pix(x, y, w, h):
        cx = (x + 0.5) / w - 0.5
        cy = ((y + 0.5) / h - 0.5) / stretch_y
        ang = math.atan2(cy, cx)
        dist = math.hypot(cx, cy) * 2.05
        n = fbm(cx * 6.0, cy * 6.0, 4, seed)
        edge = 1.0 + (n - 0.5) * noise_amt * 2.0
        edge += 0.06 * math.sin(ang * 5.0 + seed)
        d = dist / max(0.15, edge)
        if d >= 1.0:
            return (0, 0, 0, 0)
        fall = 1.0 - d
        # harder core, softer fringe
        a = fall ** (1.0 + hardness * 3.0)
        a = a * a * (3.0 - 2.0 * a)
        heat = clamp(fall ** 0.65)
        r = int(lerp(outer[0], inner[0], heat))
        g = int(lerp(outer[1], inner[1], heat))
        b = int(lerp(outer[2], inner[2], heat))
        return (r, g, b, int(255 * clamp(a)))

    img = write_pixels(new_img(size, size), pix)
    return img.filter(ImageFilter.GaussianBlur(radius=0.7))


def smoke_puff(size=96):
    def pix(x, y, w, h):
        cx = (x + 0.5) / w - 0.5
        cy = (y + 0.5) / h - 0.5
        dist = math.hypot(cx, cy) * 2.1
        n = fbm(cx * 4.2 + 2.0, cy * 4.2, 5, 77)
        n2 = fbm(cx * 8.0, cy * 8.0, 3, 91)
        # lumpy cloud
        d = dist / (0.85 + (n - 0.5) * 0.55)
        if d >= 1.05:
            return (0, 0, 0, 0)
        fall = clamp(1.0 - d)
        a = (fall ** 1.35) * (0.55 + n2 * 0.45) * 0.92
        shade = 40 + int(n * 70)
        r = shade + 18
        g = shade + 10
        b = shade
        return (r, g, b, int(255 * clamp(a)))

    img = write_pixels(new_img(size, size), pix)
    return img.filter(ImageFilter.GaussianBlur(radius=1.4))


def spark_tex(w=32, h=64):
    def pix(x, y, W, H):
        cx = (x + 0.5) / W - 0.5
        # bright head near top, taper down
        ty = (y + 0.5) / H
        head = 0.22
        # width envelope
        if ty < head:
            width = 0.22 + (head - ty) * 0.6
            heat = 1.0
        else:
            t = (ty - head) / (1.0 - head)
            width = 0.18 * (1.0 - t) ** 1.4 + 0.02
            heat = 1.0 - t * 0.85
        nx = abs(cx) / max(0.02, width)
        if nx >= 1.0:
            return (0, 0, 0, 0)
        a = (1.0 - nx) ** 1.6 * heat
        r = 255
        g = int(230 * heat + 20)
        b = int(140 * heat * heat)
        return (r, g, b, int(255 * clamp(a)))

    img = write_pixels(new_img(w, h), pix)
    return img.filter(ImageFilter.GaussianBlur(radius=0.6))


def flash_glow(size=160):
    def pix(x, y, w, h):
        cx = (x + 0.5) / w - 0.5
        cy = (y + 0.5) / h - 0.5
        d = math.hypot(cx, cy) * 2.0
        if d >= 1.0:
            return (0, 0, 0, 0)
        # very soft, hot center
        a = (1.0 - d) ** 2.4
        core = (1.0 - d) ** 6.0
        r = 255
        g = int(lerp(170, 255, core))
        b = int(lerp(40, 230, core))
        return (r, g, b, int(255 * clamp(a)))

    return write_pixels(new_img(size, size), pix)


def shock_ring(size=160):
    def pix(x, y, w, h):
        cx = (x + 0.5) / w - 0.5
        cy = (y + 0.5) / h - 0.5
        d = math.hypot(cx, cy) * 2.0
        # thin ring around 0.78
        band = abs(d - 0.78)
        if band > 0.14:
            return (0, 0, 0, 0)
        a = (1.0 - band / 0.14) ** 1.8
        # fade inner a bit more
        if d < 0.78:
            a *= 0.55
        return (255, 236, 200, int(255 * clamp(a * 0.9)))

    img = write_pixels(new_img(size, size), pix)
    return img.filter(ImageFilter.GaussianBlur(radius=0.8))


def fireball_frame(size, frame, total=12):
    t = frame / (total - 1)
    # expand then linger
    radius = 0.16 + smooth(min(1.0, t / 0.55)) * 0.36
    if t > 0.55:
        radius += (t - 0.55) * 0.08
    # alpha: snap on, hold, fade
    if t < 0.12:
        master = t / 0.12
    elif t < 0.45:
        master = 1.0
    else:
        master = (1.0 - (t - 0.45) / 0.55) ** 1.15

    # mushroom lift on later frames
    lift = max(0.0, t - 0.35) * 0.18
    wobble_phase = frame * 0.7

    def pix(x, y, w, h):
        cx = (x + 0.5) / w - 0.5
        cy = (y + 0.5) / h - 0.5 + lift * 0.15
        ang = math.atan2(cy, cx)
        dist = math.hypot(cx, cy)

        n = fbm(cx * 5.5 + 3.0, cy * 5.5 + frame * 0.15, 5, 11)
        n2 = fbm(math.cos(ang) * 2.4, math.sin(ang) * 2.4 + t * 2.0, 3, 23)
        # Start nearly circular, get lumpy as it expands — avoid a regular star.
        lump = 0.05 + t * 0.20
        lobes = lump * (
            0.35 * math.sin(ang * 3.0 + wobble_phase)
            + 0.22 * math.sin(ang * 7.0 - wobble_phase * 1.3)
            + 0.14 * math.sin(ang * 11.0 + wobble_phase * 0.45)
            + 0.85 * (n - 0.5)
        )
        # later frames get a wider, flatter cap
        cap = 1.0
        if t > 0.4 and cy < 0:
            cap = 1.0 + (0.35 * (t - 0.4) / 0.6) * (-cy * 2.2)
        rmax = radius * (1.0 + lobes) * cap
        if rmax < 0.04:
            return (0, 0, 0, 0)
        u = dist / rmax
        if u > 1.18:
            return (0, 0, 0, 0)

        # soft shell
        if u < 0.55:
            shell = 1.0
        else:
            shell = clamp(1.0 - (u - 0.55) / 0.63)
        shell = shell * shell * (3.0 - 2.0 * shell)

        heat = clamp(max(0.0, 1.0 - u) ** 0.72 + (n2 - 0.5) * 0.18)
        # core
        core = clamp(max(0.0, 0.28 - u) / 0.28) ** 1.6

        # color ramp: white core -> yellow -> orange -> deep red -> sooty
        if heat > 0.75:
            k = (heat - 0.75) / 0.25
            r, g, b = 255, int(lerp(220, 255, k)), int(lerp(80, 230, k))
        elif heat > 0.45:
            k = (heat - 0.45) / 0.30
            r, g, b = 255, int(lerp(110, 220, k)), int(lerp(20, 80, k))
        elif heat > 0.2:
            k = (heat - 0.2) / 0.25
            r, g, b = int(lerp(180, 255, k)), int(lerp(30, 110, k)), int(lerp(10, 20, k))
        else:
            k = heat / 0.2
            r, g, b = int(lerp(40, 180, k)), int(lerp(18, 30, k)), int(lerp(12, 10, k))

        # late frames shift toward smoke
        if t > 0.62:
            s = (t - 0.62) / 0.38
            r = int(lerp(r, 55 + n * 30, s * 0.7))
            g = int(lerp(g, 48 + n * 22, s * 0.7))
            b = int(lerp(b, 42 + n * 18, s * 0.7))

        a = shell * master
        a *= 0.55 + 0.45 * heat
        a = max(a, core * master * 0.95)
        if a < 0.01:
            return (0, 0, 0, 0)
        return (r, g, b, int(255 * clamp(a)))

    img = write_pixels(new_img(size, size), pix)
    return img.filter(ImageFilter.GaussianBlur(radius=0.9))


def save(img, name):
    path = os.path.join(OUT, name)
    img.save(path, "PNG")
    print("wrote", path, img.size)
    return path


def contact_sheet(images, cols, cell, path):
    rows = math.ceil(len(images) / cols)
    sheet = Image.new("RGBA", (cols * cell, rows * cell), (18, 22, 32, 255))
    # checker so alpha is visible
    chk = 8
    px = sheet.load()
    for y in range(sheet.size[1]):
        for x in range(sheet.size[0]):
            on = ((x // chk) + (y // chk)) & 1
            if on:
                px[x, y] = (28, 34, 48, 255)
    for i, im in enumerate(images):
        c = i % cols
        r = i // cols
        fitted = im.copy()
        fitted.thumbnail((cell - 8, cell - 8), Image.Resampling.LANCZOS)
        ox = c * cell + (cell - fitted.size[0]) // 2
        oy = r * cell + (cell - fitted.size[1]) // 2
        sheet.alpha_composite(fitted, (ox, oy))
    sheet.save(path)
    print("wrote", path)


def main():
    fire_hot = soft_blob(64, (255, 255, 240), (255, 170, 40), hardness=0.18, noise_amt=0.10, seed=3)
    fire_mid = soft_blob(64, (255, 210, 80), (255, 70, 10), hardness=0.22, noise_amt=0.16, seed=8)
    fire_cool = soft_blob(64, (255, 90, 20), (90, 10, 4), hardness=0.28, noise_amt=0.20, seed=14)
    smoke = smoke_puff(96)
    spark = spark_tex(32, 64)
    flash = flash_glow(160)
    ring = shock_ring(160)

    save(fire_hot, "fire_hot.png")
    save(fire_mid, "fire_mid.png")
    save(fire_cool, "fire_cool.png")
    save(smoke, "smoke.png")
    save(spark, "spark.png")
    save(flash, "flash.png")
    save(ring, "shock_ring.png")

    frames = [fireball_frame(256, i, 12) for i in range(12)]
    for i, fr in enumerate(frames):
        save(fr, f"fireball_{i:02d}.png")

    contact_sheet(
        [fire_hot, fire_mid, fire_cool, smoke, spark, flash, ring] + frames,
        cols=7,
        cell=140,
        path=os.path.join(OUT, "_preview_sheet.png"),
    )


if __name__ == "__main__":
    main()
