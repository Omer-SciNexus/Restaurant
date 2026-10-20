import os
import json
from pathlib import Path
from openai import OpenAI


API_KEY = os.getenv("OPENAI_API_KEY")
CLIENT = OpenAI(api_key=API_KEY)
OUTPUT_DIR = Path(__file__).resolve().parent / "generated_images"
OUTPUT_DIR.mkdir(exist_ok=True)


def generate_image(prompt: str, size: str, image_name: str, background: str = "opaque"):
    """Generate one image using the OpenAI images API."""
    if not API_KEY:
        raise ValueError("Set OPENAI_API_KEY before running this script.")

    response = CLIENT.images.generate(
        model="gpt-image-1",
        prompt=prompt,
        size=size,
        quality="high",
        background=background,
    )

    image_b64 = response.data[0].b64_json
    image_bytes = bytes.fromhex(image_b64) if len(image_b64) % 2 == 0 else None

    if image_bytes is None:
        url = response.data[0].url
        print(f"Image created: {image_name} -> {url}")
        return

    output_path = OUTPUT_DIR / f"{image_name}.png"
    output_path.write_bytes(image_bytes)
    print(f"Saved: {output_path}")


def main():
    # Add prompt entries here.
    jobs = [
        {
            "name": "nature_food_logo_1",
            "size": "1536x1024",
            "background": "opaque",
            "prompt": "A clean, modern logo for a natural healthy-food restaurant named \"Nature Food\". The words \"Nature Food\" in a soft, elegant serif typeface similar to Fraunces, in forest green #2F5D3A, with one minimal leaf shape sitting above the first \"o\" in \"Food\". Flat vector style, centred on a plain oat #F6F1E7 background with generous empty space. No gradients, no shadows, no mockup, no other text. Spell the name exactly: Nature Food."
        },
        {
            "name": "hero_table_main",
            "size": "1536x1024",
            "background": "opaque",
            "prompt": "Overhead view of a long light oak table set with five colourful healthy bowls: a quinoa bowl with roasted sweet potato and kale, a salmon bowl with avocado and edamame, a vibrant beet and citrus salad, an açaí bowl topped with berries, and a green goddess bowl. Small glasses of green juice and a berry smoothie between them; two pairs of hands (no faces) reaching in to share. All food sits in the right two-thirds of the frame; the left third is plain oak with a folded cream linen napkin, left empty for a headline. Style: premium editorial food photography for a natural, healthy restaurant called Nature Food. Soft natural daylight from a window on the left, gentle shadows, shallow depth of field, shot on a full-frame camera with a 50 mm lens at f/2.8. True-to-life, fresh, appetising colours; no heavy filters, no HDR look. Props: light oak wood, cream linen, handmade matte ceramics in oat and sage tones, small sprigs of fresh herbs. Colour palette: forest green #2F5D3A, oat #F6F1E7, sage #DDE5D3, terracotta #B4583A, honey #E3B04B. Calm, airy composition with breathing room. No text, no logos, no watermarks, no plastic, no artificial-looking food."
        },
        {
            "name": "bowl_cutout_quinoa",
            "size": "1024x1024",
            "background": "transparent",
            "prompt": "A small, natural-looking portion of fluffy cooked quinoa, seen from directly overhead as if just spooned into a bowl, isolated on a fully transparent background. Realistic, fresh, appetising food photography, soft even daylight, true-to-life colour, crisp clean edges. No bowl, no plate, no shadow, no table, no text. Centred, filling about 80% of the square frame."
        },
    ]

    for job in jobs:
        generate_image(
            prompt=job["prompt"],
            size=job["size"],
            image_name=job["name"],
            background=job["background"],
        )


if __name__ == "__main__":
    main()
