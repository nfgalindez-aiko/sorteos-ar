# Respuesta a Apple — Guideline 2.1 (Information Needed), envío 1.0

Apple no encontró nada mal en la app: es el pedido estándar de información a cuentas de
desarrollador nuevas. Piden 6 cosas; 5 son texto (abajo) y la sexta es el video
`docs/sorteos-ar-demo.mp4` (1:20, grabado en iPhone, 4,1 MB).

Apple pide además pegar este mismo texto en **App Review Information → Notes**, para las
próximas versiones. Hacerlo una vez y queda.

---

Hello, and thank you for the review. Below is all the requested information. We are also adding it to the App Review Information Notes field.

2. PURPOSE AND TARGET AUDIENCE
Sorteos AR is an information-only app that shows the published results of Argentina's public lottery draws (Quini 6, Brinco, Loto Plus, Poceada) and the "quiniela" draws of several provinces. Target audience: adults in Argentina who currently have to check these numbers on newspaper websites or ask at a betting agency. The problem it solves: results are scattered across many low-quality sites and are often published with errors, so the app cross-checks two independent public sources and only marks a result as confirmed when both match number for number. The app does NOT allow betting, does not sell or facilitate the purchase of tickets, has no links to gambling sites, has no in-app purchases and has no ads. It is purely a reference/news app, like a newspaper results page.

3. SETUP AND ACCESS TO MAIN FEATURES
No login, no account and no credentials are required. Everything is visible immediately on launch:
- Home: one card per game with the latest draw, the estimated next jackpot and a countdown.
- Tap a card: full detail with every game mode, drawn numbers and the prize table (matches, winners, prize per bet).
- "Sorteos anteriores": list of past draws.
- "Controlar jugada": the user types 6 numbers of their own and the app highlights which of them came out in each game mode. It only compares numbers; it never suggests or recommends numbers, and nothing is submitted anywhere. These numbers are stored only on the device and can be deleted in Settings.
- Ajustes (Settings): legal notice, sources, delete saved numbers, and an optional "report a problem" text box.

4. EXTERNAL SERVICES USED
- Data source: our own static JSON published on GitHub Pages (https://nfgalindez-aiko.github.io/sorteos-ar/data/). A GitHub Actions job reads two public results websites (tujugada.com.ar and quini-6-resultados.com.ar) and publishes the result only when both agree. The app itself never scrapes any site; it only downloads that JSON file. The video shows this: tapping the "2 fuentes" label lists both sources in the app.
- Optional bug report: a Cloudflare Worker owned by the developer that forwards the user's text by email to the developer. Sending is entirely optional and no personal data is requested.
- No authentication services, no payment processors, no AI services, no analytics and no advertising SDKs.

5. REGIONAL DIFFERENCES
None. The app behaves identically in every region. The content is about Argentine lotteries and is in Spanish, but there are no region locks, no different features and no different content by country.

6. REGULATED INDUSTRY / THIRD-PARTY MATERIAL
The app does not operate in the gambling industry: it does not accept bets, does not process money and does not enable gambling in any form, so no gambling license is required. Game names (Quini 6, Brinco, Loto Plus) are used only descriptively to identify which public draw each result belongs to, in the same way a newspaper reports them. The app is not affiliated with, endorsed by or sponsored by any lottery operator, and this is stated on the home screen, in the detail screens, in Settings and in the App Store description. Results are public factual information (drawn numbers). The app is rated 18+ and displays the responsible-gaming notice required in Argentina.

1. SCREEN RECORDING
Attached: a screen recording captured on a physical iPhone running the latest iOS (1 minute 20 seconds), starting from app launch and showing the typical user flow: home screen with all games, game detail with numbers and prize table, the "2 fuentes" explanation, past draws, the "check my numbers" feature, and a quiniela draw. The app has no account registration, no login, no account deletion, no user-generated content shared between users and no paid content, so those flows do not exist in the app.

Thank you very much for your time.
