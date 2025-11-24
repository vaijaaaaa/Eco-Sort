from icrawler.builtin import BingImageCrawler
import os

keywords = ["bottle", "banana","syringes"]

for kw in keywords:
    save_path = f"simple_images/{kw}"

    # create folder if not exists
    os.makedirs(save_path, exist_ok=True)

    print(f"Downloading: {kw}")

    crawler = BingImageCrawler(storage={"root_dir": save_path})
    crawler.crawl(keyword=kw, max_num=50)

print("DONE ✔")
