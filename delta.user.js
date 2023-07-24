// ==UserScript==
// @name         r/placeDE Automation
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  try to take over the canvas!
// @author       deltazero
// @match        https://garlic-bread.reddit.com/embed*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
// @updateURL    https://github.com/PlaceDE-Official/place-overlay/raw/main/src/scripts/placeDE-overlay.user.js
// @downloadURL  https://github.com/PlaceDE-Official/place-overlay/raw/main/src/scripts/placeDE-overlay.user.js
// @run-at   document-start
// ==/UserScript==

let overlayImage = null;
if (window.top !== window.self) {
  window.addEventListener(
    "load",
    async () => {
      function getPixelAccess(url) {
        return new Promise(function (resolve, reject) {
          const canvas = document.createElement("canvas");
          const img = new Image();
          img.onload = (event) => {
            URL.revokeObjectURL(event.target.src); // Once it loaded the resource, then you can free it at the beginning.
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(event.target, 0, 0);
            console.log("loaded", img.width, img.height);
            resolve(new PixelAccess(canvas));
          };
          img.src = url;
          img.crossOrigin = "anonymous";
        });
      }

      // async function getPixelAccess(url) {
      //   const canvas = await renderImage(url);
      //   return new PixelAccess(canvas);
      // }

      class PixelAccess {
        constructor(canvas) {
          const { width, height } = canvas;
          this.width = width;
          this.height = height;
          this.pixels = canvas.getContext("2d").getImageData(0, 0, width, height).data;
        }

        get(x, y) {
          return this.pixels.slice(4 * (y * this.width + x), 4 * (y * this.width + x + 1));
        }

        static toHexColor(r, g, b, a = null) {
          const array = a === null ? [r, g, b] : [r, g, b, a];
          return `#${array.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
        }

        static getColorDifference(colorHex1, colorHex2) {
          const dr = parseInt(colorHex1.slice(1, 3), 16) - parseInt(colorHex2.slice(1, 3), 16);
          const dg = parseInt(colorHex1.slice(3, 5), 16) - parseInt(colorHex2.slice(3, 5), 16);
          const db = parseInt(colorHex1.slice(5, 7), 16) - parseInt(colorHex2.slice(5, 7), 16);
          return Math.abs(dr) + Math.abs(dg) + Math.abs(db);
        }
      }

      const rgb2hex = (rgb) => "#" + rgb.match(/\d+/g).map((x) => (+x).toString(16).padStart(2, 0)).join``;

      const canvas = document.querySelector("garlic-bread-embed");
      const placeBtn = canvas.shadowRoot.querySelector("div.layout").querySelector("garlic-bread-status-pill").shadowRoot.querySelector("button");
      const confirmBtn = canvas.shadowRoot.querySelector("div.layout").querySelector("garlic-bread-color-picker").shadowRoot.querySelector("button.confirm");
      const colors = [
        ...canvas.shadowRoot.querySelector("div.layout").querySelector("garlic-bread-color-picker").shadowRoot.querySelectorAll("button[data-color]"),
      ].map((e) => ({
        id: e.getAttribute("data-color"),
        color: rgb2hex(e.querySelector("div").style.backgroundColor),
      }));
      canvas.setPixelAndColor = (x, y, colorId) => {
        return new Promise((resolve, reject) => {
          placeBtn.click();
          setTimeout(() => {
            canvas.selectPixel({ x, y });
            canvas.selectedColor = colorId;
            setTimeout(() => {
              confirmBtn.click();
              console.log("clicked");
              setTimeout(resolve, 240_000);
            }, 1000);
          }, 1000);
        });
      };

      canvas.getPixelColor = (x, y) => canvas.canvas.getPixelColor({ x: x, y: y });
      const px = await getPixelAccess("https://i.imgur.com/hUfZuiu.png");

      // const placeImage = async () => {
      //   for (let y = 0; y < px.height; y++) {
      //     for (let x = 0; x < px.width; x++) {
      //       const [r, g, b, a] = px.get(x, y);
      //       if (a < 255) continue;
      //       const targetColor = PixelAccess.toHexColor(r, g, b);
      //       const { id: targetId } = colors.toSorted(
      //         ({ color: colorA }, { color: colorB }) => PixelAccess.getColorDifference(colorA, targetColor) - PixelAccess.getColorDifference(colorB, targetColor)
      //       )[0];
      //       const pixelColor = canvas.getPixelColor(x, y);
      //       const { id: pixelId } = colors.toSorted(
      //         ({ color: colorA }, { color: colorB }) => PixelAccess.getColorDifference(colorA, pixelColor) - PixelAccess.getColorDifference(colorB, pixelColor)
      //       )[0];
      //       if (targetId != pixelId) {
      //         await canvas.setPixelAndColor(x, y, targetId);
      //       }
      //     }
      //   }
      // };

      const offset = {
        x: 3642,
        y: 1300,
      };

      const getNext = () => {
        for (let y = 0; y < px.height; y++) {
          for (let x = 0; x < px.width; x++) {
            const [r, g, b, a] = px.get(x, y);
            if (a < 255) continue;
            const targetColor = PixelAccess.toHexColor(r, g, b);
            const { id: targetId } = colors.toSorted(
              ({ color: colorA }, { color: colorB }) =>
                PixelAccess.getColorDifference(colorA, targetColor) - PixelAccess.getColorDifference(colorB, targetColor)
            )[0];
            const pixelColor = canvas.getPixelColor(x + offset.x, y + offset.y);
            const { id: pixelId } = colors.toSorted(
              ({ color: colorA }, { color: colorB }) => PixelAccess.getColorDifference(colorA, pixelColor) - PixelAccess.getColorDifference(colorB, pixelColor)
            )[0];
            if (targetId != pixelId) {
              // canvas.setPixelAndColor(x, y, targetId);
              // setTimeout(placeNext, 3000);
              return { x: x + offset.x, y: y + offset.y, targetId: +targetId };
            }
          }
        }
      };
      console.log(getNext());

      const placeNext = () => {
        const { x, y, targetId } = getNext();
        canvas.setPixelAndColor(x, y, targetId);
        setTimeout(() => {
          const int = setInterval(() => {
            const placable = !!canvas.shadowRoot.querySelector("div.layout").querySelector("garlic-bread-status-pill").shadowRoot.querySelector("button");
            if (placable) {
              placeNext();
              clearInterval(int);
            }
          }, 100);
        }, 5_000);
      };

      setTimeout(placeNext, 20_000);
    },
    false
  );
}
