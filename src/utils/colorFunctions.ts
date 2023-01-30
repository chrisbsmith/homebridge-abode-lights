import kelvinToRgb from 'kelvin-to-rgb';
import convert from 'color-convert';

export const convertKelvinToHSL = (value: number) => {
  const [r, g, b] = kelvinToRgb(value);
  const [h, s, v] = convert.rgb.hsv(r, g, b);
  return {
    h: Math.round(h),
    s: Math.round(s),
    v: Math.round(v),
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
  };
};

export const convertKelvinMireds = (value: any) => {
  return 1000000 / value;
};
