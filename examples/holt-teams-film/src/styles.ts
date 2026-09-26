// The film's static styling, on a fixed 1920x1080 canvas. Motion lives in the scene
// components as inline styles; this file only says what things look like at rest.
//
// Every colour is derived from four brand variables (--accent, --accent2, --bg, --text)
// with color-mix, so one palette change re-skins the whole film.
export const css = `
.film{--surface:color-mix(in oklab,var(--bg) 94%,var(--text));--surface-2:color-mix(in oklab,var(--bg) 90%,var(--text));
  --inset:color-mix(in oklab,var(--bg) 70%,#000);--border:color-mix(in oklab,var(--bg) 85%,var(--text));
  --border-strong:color-mix(in oklab,var(--bg) 78%,var(--text));--text-2:color-mix(in oklab,var(--text) 64%,var(--bg));
  --text-3:color-mix(in oklab,var(--text) 52%,var(--bg));--accent-tint:color-mix(in oklab,var(--accent) 12%,var(--bg));
  --accent-line:color-mix(in oklab,var(--accent) 38%,var(--bg));
  position:absolute;inset:0;overflow:hidden;background:var(--bg);color:var(--text);font-family:var(--f-body)}
.film *{box-sizing:border-box}
.glow{position:absolute;border-radius:50%;filter:blur(120px)}
.grid{position:absolute;inset:0;background-image:linear-gradient(color-mix(in oklab,var(--text) 3%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in oklab,var(--text) 3%,transparent) 1px,transparent 1px);background-size:80px 80px;-webkit-mask-image:radial-gradient(ellipse at center,#000 30%,transparent 80%)}
.vignette{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,.55))}
.chrome{position:absolute;font:500 18px/1 var(--f-mono);color:var(--text-3);letter-spacing:.08em;z-index:5}
.brandmark{left:72px;top:60px;display:flex;align-items:center;gap:12px}
.brandmark b{font:700 26px/1 var(--f-display);letter-spacing:-.03em;color:var(--text)}
.brandmark span{color:var(--accent)}
.tick{position:absolute;width:22px;height:22px;border-color:var(--border-strong);border-style:solid;z-index:5}
.scene{position:absolute;inset:0}
.eyebrow{font:500 20px/1 var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--text-3);display:flex;align-items:center;gap:14px}
.eyebrow::before{content:"";width:9px;height:9px;border-radius:50%;background:var(--accent)}
.h1{font:600 88px/1.04 var(--f-display);letter-spacing:-.035em;margin:0}
.h2{font:600 64px/1.08 var(--f-display);letter-spacing:-.03em;margin:0}
.w{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.1em;margin-bottom:-.1em}
.wi{display:inline-block}
.em{color:var(--accent)}
.top{position:absolute;left:160px;top:150px;right:160px}
.term{position:absolute;left:50%;top:300px;width:1140px;margin-left:-570px;background:var(--surface-2);border:1px solid var(--border-strong);border-radius:14px;box-shadow:0 60px 120px -30px rgba(0,0,0,.8);overflow:hidden}
.term-bar{height:52px;display:flex;align-items:center;gap:10px;padding:0 22px;border-bottom:1px solid var(--border);background:var(--surface)}
.term-bar i{width:13px;height:13px;border-radius:50%;background:var(--border-strong)}
.term-bar span{margin:0 auto;font:500 17px var(--f-mono);color:var(--text-3);transform:translateX(-30px)}
.term-body{padding:34px 40px 40px;font:400 25px/1.75 var(--f-mono);min-height:360px;position:relative}
.term-body .ln{white-space:pre-wrap}
.stamp{position:absolute;right:30px;top:24px;font:500 17px var(--f-mono);color:var(--accent);border:1px solid var(--accent-line);background:var(--accent-tint);padding:7px 12px;border-radius:6px;letter-spacing:.06em}
.dim{color:var(--text-3)}.c-acc{color:var(--accent)}.c-cy{color:var(--accent2)}.c-2{color:var(--text-2)}
.caret{display:inline-block;width:13px;height:28px;background:var(--accent);vertical-align:-5px;margin-left:2px}
.chips{position:absolute;left:160px;right:160px;top:420px;display:flex;flex-wrap:wrap;gap:22px;justify-content:center}
.chip{display:flex;align-items:center;gap:16px;padding:20px 28px;border:1px solid var(--border-strong);border-radius:12px;background:var(--surface-2);font:500 30px var(--f-body)}
.chip small{font:500 17px var(--f-mono);color:var(--text-3);letter-spacing:.06em}
.below{position:absolute;left:160px;right:160px;top:800px;text-align:center}
.swap{position:relative;height:60px}
.swap p{position:absolute;inset:0;margin:0;font:500 40px/1.3 var(--f-display);letter-spacing:-.02em;color:var(--text-2)}
.stack{position:absolute;left:220px;top:430px;display:flex;flex-direction:column;gap:18px}
.stack div{width:430px;padding:22px 26px;border:1px solid var(--border-strong);background:var(--surface-2);border-radius:10px;font:500 28px var(--f-body);display:flex;align-items:center;gap:16px}
.stack div::before{content:"";width:10px;height:10px;border-radius:2px;background:var(--accent)}
.flowbar{position:absolute;left:700px;top:560px;width:620px;height:4px;background:linear-gradient(90deg,var(--accent),var(--text-3));transform-origin:left center;border-radius:2px}
.dest{position:absolute;left:1360px;top:430px;width:360px;height:260px;border:1px dashed var(--text-3);border-radius:26px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:var(--text-2);font:500 26px var(--f-body);text-align:center;padding:0 20px}
.dest svg{width:88px;height:88px;color:var(--text-3)}
.lock{position:absolute;left:955px;top:500px;width:120px;height:120px;border-radius:50%;background:color-mix(in oklab,var(--danger) 16%,var(--bg));border:2px solid var(--danger);display:grid;place-items:center;color:var(--danger);box-shadow:0 0 60px color-mix(in oklab,var(--danger) 35%,transparent)}
.lock svg{width:58px;height:58px}
.lock-label{position:absolute;left:880px;top:650px;width:270px;text-align:center;font:600 20px var(--f-mono);letter-spacing:.12em;color:var(--danger)}
.quote{position:absolute;left:220px;right:220px;top:300px}
.quote .mark{font:700 200px/.6 var(--f-display);color:var(--accent);height:90px;display:block}
.quote blockquote{margin:0;font:500 76px/1.14 var(--f-display);letter-spacing:-.03em}
.quote cite{display:block;margin-top:40px;font:500 22px var(--f-mono);font-style:normal;color:var(--text-3);letter-spacing:.08em;text-transform:uppercase}
.stat{position:absolute;left:220px;bottom:150px;display:flex;align-items:baseline;gap:26px}
.stat b{font:700 96px/1 var(--f-display);color:var(--accent);letter-spacing:-.04em}
.stat span{font:400 32px var(--f-body);color:var(--text-2)}
.logo{position:absolute;left:50%;top:50%;width:max-content;display:flex;align-items:center;gap:40px}
.wordmark{position:relative;font:700 240px/1 var(--f-display);letter-spacing:-.06em;display:flex}
.wordmark .ch{display:inline-block}
.wordmark .bar{position:absolute;left:10px;bottom:-26px;width:130px;height:12px;border-radius:6px;background:var(--accent);transform-origin:left}
.brandtag{align-self:flex-end;margin-bottom:34px;margin-left:10px;font:600 40px/1 var(--f-mono);color:var(--accent);border:2px solid var(--accent-line);background:var(--accent-tint);padding:14px 22px;border-radius:10px}
.tagline{position:absolute;left:0;right:0;top:760px;text-align:center}
.tagline p{margin:0;font:500 46px/1.3 var(--f-display);letter-spacing:-.02em;color:var(--text-2)}
.tile{position:absolute;width:76px;height:76px;display:grid;place-items:center;font:700 30px var(--f-display);color:#17140E;clip-path:polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,0 100%)}
.agent{position:absolute;height:64px;padding:0 22px;display:flex;align-items:center;gap:14px;border:1px solid var(--border-strong);background:var(--surface-2);border-radius:10px;font:500 24px var(--f-body);white-space:nowrap}
.agent small{font:500 15px var(--f-mono);color:var(--text-3);border:1px solid var(--border);padding:4px 8px;border-radius:5px;letter-spacing:.06em}
.hub{position:absolute;left:910px;top:410px;width:320px;height:320px;border-radius:50%;border:1px solid var(--accent-line);background:radial-gradient(circle,color-mix(in oklab,var(--accent) 16%,var(--surface)),var(--surface) 70%);display:grid;place-items:center}
.hub-label{position:absolute;left:910px;width:320px;top:750px;text-align:center;font:600 20px var(--f-mono);letter-spacing:.14em;color:var(--accent)}
.ghost{position:absolute;left:1590px;top:470px;width:220px;text-align:center;color:var(--text-3);font:500 21px var(--f-body)}
.ghost svg{width:96px;height:96px;display:block;margin:0 auto 10px}
.never{position:absolute;left:1480px;top:720px;width:420px;text-align:center;font:600 26px var(--f-display)}
.card{position:absolute;left:160px;top:330px;width:940px;background:var(--surface-2);border:1px solid color-mix(in oklab,var(--accent) 30%,var(--surface-2));border-radius:14px;overflow:hidden;box-shadow:0 50px 100px -30px rgba(0,0,0,.7)}
.card-h{display:flex;align-items:center;gap:12px;padding:20px 30px;border-bottom:1px solid var(--border);font:500 18px var(--f-mono);color:var(--accent);letter-spacing:.08em;background:color-mix(in oklab,var(--accent) 7%,var(--surface-2))}
.card-h svg{width:20px;height:20px}
.card pre{margin:0;padding:28px 34px 34px;font:400 23px/1.72 var(--f-mono);color:var(--text-2);white-space:pre-wrap}
.card .fl{display:block;border-radius:4px}
.k{color:var(--accent2)}.s{color:var(--text)}.n{color:var(--accent)}
.callouts{position:absolute;left:1180px;top:340px;width:600px;display:flex;flex-direction:column;gap:30px}
.co{padding-left:26px;border-left:3px solid var(--accent)}
.co b{display:block;font:600 22px var(--f-mono);color:var(--accent);margin-bottom:8px}
.co p{margin:0;font:400 28px/1.4 var(--f-body);color:var(--text-2)}
.dots{position:absolute;left:160px;top:420px;display:grid;grid-template-columns:repeat(36,16px);gap:8px}
.dots i{width:16px;height:16px;border-radius:3px}
.cnt{position:absolute;left:160px;top:830px}
.cnt b{font:700 84px/1 var(--f-display);letter-spacing:-.04em;display:block;font-variant-numeric:tabular-nums}
.cnt span{font:500 20px var(--f-mono);color:var(--text-3);letter-spacing:.06em;text-transform:uppercase}
.budget{position:absolute;left:1120px;top:420px;width:640px}
.budget .lbl{font:500 20px var(--f-mono);color:var(--text-3);letter-spacing:.1em;text-transform:uppercase;margin-bottom:22px}
.tbar{display:flex;height:120px;border-radius:12px;overflow:hidden;border:1px solid var(--border-strong);background:var(--inset)}
.seg{height:100%;display:flex;align-items:center;padding:0 16px;font:600 18px var(--f-mono);color:#17140E;border-right:2px solid var(--bg);transform-origin:left;white-space:nowrap}
.legend{margin-top:26px;display:grid;grid-template-columns:1fr 1fr;gap:14px 30px;font:400 22px var(--f-body);color:var(--text-2)}
.legend div{display:flex;gap:12px;align-items:center}.legend i{width:14px;height:14px;border-radius:3px}
.fixed{margin-top:46px;display:flex;align-items:center;gap:20px}
.fixed b{font:700 84px/1 var(--f-display);color:var(--accent);letter-spacing:-.04em}
.fixed span{font:400 26px/1.35 var(--f-body);color:var(--text-2)}
.cards4{position:absolute;left:160px;right:160px;top:420px;display:grid;gap:26px}
.pc{background:var(--surface-2);border:1px solid var(--border-strong);border-radius:14px;padding:34px 30px 36px;min-height:300px}
.pc .ic{width:64px;height:64px;border-radius:12px;display:grid;place-items:center;background:var(--accent-tint);border:1px solid var(--accent-line);color:var(--accent);margin-bottom:28px}
.pc .ic svg{width:32px;height:32px}
.pc h3{margin:0 0 12px;font:600 30px/1.15 var(--f-display);letter-spacing:-.02em}
.pc p{margin:0;font:400 22px/1.45 var(--f-body);color:var(--text-2)}
.log{position:absolute;left:160px;right:160px;top:790px;background:var(--inset);border:1px solid var(--border);border-radius:12px;padding:20px 28px;font:400 20px/1.8 var(--f-mono);color:var(--text-3)}
.log .ah{letter-spacing:.12em;font-size:15px;margin-bottom:4px}
.log .row{white-space:pre}
.cols{position:absolute;left:160px;right:160px;top:400px;display:grid;grid-template-columns:1fr 1fr;gap:60px}
.col h4{margin:0 0 30px;font:600 20px var(--f-mono);letter-spacing:.14em;text-transform:uppercase;padding-bottom:18px;border-bottom:1px solid var(--border-strong)}
.col.now h4{color:var(--success)}.col.next h4{color:var(--accent)}
.it{display:flex;align-items:center;gap:20px;font:400 30px/1.3 var(--f-body);margin-bottom:24px}
.it svg{width:36px;height:36px;flex:none}
.now .it svg{color:var(--success)}.next .it svg{color:var(--accent)}
.footnote{position:absolute;left:160px;bottom:120px;font:500 22px var(--f-mono);color:var(--text-3);letter-spacing:.06em}
.nums{position:absolute;left:160px;right:160px;top:380px;display:grid;gap:40px}
.num{border-top:2px solid var(--accent-line);padding-top:30px}
.num b{display:block;font:700 190px/.9 var(--f-display);letter-spacing:-.05em;font-variant-numeric:tabular-nums}
.num span{display:block;margin-top:20px;font:400 30px/1.3 var(--f-body);color:var(--text-2)}
.price{position:absolute;left:160px;right:160px;top:800px;display:flex;align-items:baseline;gap:30px}
.price b{font:700 64px var(--f-display);color:var(--accent);letter-spacing:-.03em}
.price span{font:400 30px var(--f-body);color:var(--text-2)}
.walk{position:absolute;left:160px;top:900px;font:500 26px var(--f-mono);color:var(--text-3)}
.cta{position:absolute;left:0;right:0;top:640px;text-align:center}
.cta h2{margin:0;font:600 72px/1.1 var(--f-display);letter-spacing:-.03em}
.links{margin-top:48px;display:flex;justify-content:center;gap:24px}
.links span{font:500 26px var(--f-mono);padding:16px 26px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2)}
.links span b{color:var(--accent);font-weight:500;display:inline-block}
`;
