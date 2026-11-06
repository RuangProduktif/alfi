"""Membuat ikon PWA Ritual (lingkaran dengan tanda centang di atas latar hijau sage).

Jalankan ulang bila desain berubah:  python3 scripts/generate-icons.py
Keluaran: public/icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png
- 'any'      : kotak membulat, sudut transparan.
- 'maskable' : latar penuh; isi berada di dalam zona aman (lingkaran berdiameter 80% dari sisi).
- apple-touch: latar penuh tanpa transparansi (iOS menerapkan maskernya sendiri).
"""
from pathlib import Path
from PIL import Image, ImageDraw

ACCENT = (63, 107, 78, 255)  # #3f6b4e, sama dengan token --accent mode terang
WHITE = (255, 255, 255, 255)
OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
SS = 4  # supersampling agar tepi halus


def draw(size: int, *, rounded: bool) -> Image.Image:
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * 0.22), fill=ACCENT)
    else:
        d.rectangle((0, 0, s, s), fill=ACCENT)

    cx = cy = s / 2
    r = s * 0.28
    w = int(s * 0.07)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=WHITE, width=w)

    pts = [(s * 0.38, s * 0.505), (s * 0.465, s * 0.59), (s * 0.63, s * 0.41)]
    d.line(pts, fill=WHITE, width=w, joint="curve")
    for x, y in (pts[0], pts[-1]):  # ujung membulat
        d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=WHITE)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    draw(192, rounded=True).save(OUT / "icon-192.png")
    draw(512, rounded=True).save(OUT / "icon-512.png")
    draw(512, rounded=False).save(OUT / "icon-maskable-512.png")
    draw(180, rounded=False).convert("RGB").save(OUT / "apple-touch-icon.png")
    for p in sorted(OUT.glob("*.png")):
        with Image.open(p) as im:
            print(p.name, im.size, im.mode)


if __name__ == "__main__":
    main()
