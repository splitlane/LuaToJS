var A, B, z, b, E, S, math, C, F, I, io, T, string, W, P, print, H, e, g, m, n, d, f, c, h, D, l, t, x, y, o, N;
A = 0;
B = 0;
z = {};
b = {};
E = {
    1: 32,
    2: 46,
    3: 44,
    4: 45,
    5: 126,
    6: 58,
    7: 59,
    8: 61,
    9: 33,
    10: 42,
    11: 35,
    12: 36,
    13: 64
};
S = math.sin;
C = math.cos;
F = math.floor;
I = io.write;
T = string.char;
W = 60;
P = print;
H = 25;
P("\\x1b[2J");
for (let w = 1; w <= 240; w++) {
    for (let o = 0; o <= W * H; o++) {
        b[o] = 1;
        z[o] = 0;
    }
    e = S(A);
    g = C(A);
    m = C(B);
    n = S(B);
    for (let j = 0; j <= 6.28; j += 0.09) {
        d = C(j);
        f = S(j);
        for (let i = 0; i <= 6.28; i += 0.04) {
            c = S(i);
            h = d + 2;
            D = 1 / c * h * e + f * g + 5;
            l = C(i);
            t = c * h * g - f * e;
            x = F(W / 2 + W * 0.3 * D * l * h * m - t * n);
            y = F(H / 2 + H * 0.6 * D * l * h * n + t * m);
            o = x + W * y;
            N = math.max(0, F(8 * f * e - c * d * g * m - c * d * e - f * g - l * d * n)) + 2;
            if (H > y && y > 0 && x > 0 && W > x && D > z[o]) {
                z[o] = D;
                b[o] = N;
            }
        }
    }
    P("\\x1b[H");
    for (let k = 0; k <= W * H; k++) {
        if (k % W !== 0) {
            I(T(E[b[k]]));
        } else {
            I(T(10));
        }
    }
    A = A + 0.04;
    B = B + 0.02;
}