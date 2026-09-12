<img width="1408" height="768" alt="Gemini_Generated_Image_pz9goopz9goopz9g" src="https://github.com/user-attachments/assets/bc70f168-551d-4a22-b451-75891b16b091" />

# 🐝 BeeEngine - Documentazione Ufficiale


Benvenuti nella repository ufficiale della documentazione di **BeeEngine**, una libreria JavaScript leggera per lo sviluppo di giochi 2D su Canvas HTML5.

---

## 📚 Cosa trovi in questo repository

Questo spazio raccoglie le guide, gli esempi pratici e le spiegazioni di tutti i moduli di BeeEngine:

* **🎮 Gameplay & Scena:** Gestione di entità, oggetti collezionabili, nemici e piattaforme.
* **🎨 Grafica & Animation:** Utilizzo di sprite, fogli sprite (`SpriteSheet`), mappe a tessere (`Tilemap`) e sistemi particellari.
* **🐞 BeeLadybug (v2.4.0):** Il modulo dedicato al debug visivo e alle metriche in tempo reale (accessibile tramite i tasti di scelta rapida `F2`, `F3`, `F4`).
* **⏱ BeeTime:** Orologio unico del core loop (`src/core/BeeTime.html`): `dt` di simulazione, `unscaledDt` reale, pausa/F4, `timeScale`, accumulator per `BeePhysicsWorld`.
* **⏱ BeeTimer:** Cooldown e loop di evento (`src/core/BeeTimer.html`): `gioco.after` / `gioco.every`, clock `gioco.timers`, assi scaled/unscaled.
* **🧭 BeeTransform:** Trasformata 2D affine (`src/core/BeeTransform.html`): `x`/`y` locali, world lazy, parent/child, `setWorldOrigin`.
* **⚙️ Fisica & Input:** Gestione dei comandi e rilevamento delle collisioni.

---

## 🛠️ Stato del Progetto

> ⚠️ **Nota:** La documentazione è attualmente in fase di sviluppo e aggiornamento continuo.

Puoi installare il motore di gioco direttamente da **NPM**:

```bash
npm install beeengine
