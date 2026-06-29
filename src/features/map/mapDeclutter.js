function expand(box, padding) {
  return {
    x: box.x - padding,
    y: box.y - padding,
    w: box.w + padding * 2,
    h: box.h + padding * 2,
  };
}

function intersects(a, b, padding = 0) {
  const box = padding ? expand(b, padding) : b;
  return a.x < box.x + box.w && a.x + a.w > box.x && a.y < box.y + box.h && a.y + a.h > box.y;
}

export function createDeclutter(initialBoxes = []) {
  const boxes = [...initialBoxes];
  return {
    canPlace(box, padding = 0) {
      return !boxes.some((item) => intersects(item, box, padding));
    },
    place(box) {
      boxes.push(box);
    },
    reset() {
      boxes.length = 0;
    },
  };
}
