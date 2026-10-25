// GEGENEREERD — niet met de hand wijzigen.
// Bron: mvgrieken/atthis-ai packages/mail-huisstijl @ ccf7e435
// Opnieuw maken: npx tsx scripts/mail-huisstijl-export.ts spatiallab
// Waarom een kopie en geen pakket: zie de kop van dat script.

export interface MailKleuren {
  /** Achter de kaart: de "pagina" van de mail. */
  achtergrond: string
  /** De kaart waar de inhoud op staat. */
  kaart: string
  tekst: string
  /** Toelichting, voet, geldigheidstermijnen. */
  gedempt: string
  rand: string
  /** De primaire knop. Bij Atthis oranje: dat is wat "primaire actie" betekent in DESIGN.md. */
  accent: string
  /** Tekstkleur op de knop. */
  opAccent: string
  link: string
}

export interface MailLogo {
  /** Absolute https-URL naar een PNG op dubbele resolutie. Geen SVG: Gmail en Outlook tonen die niet. */
  src: string
  /** Weergavebreedte in px (de helft van de PNG). */
  breedte: number
  hoogte: number
  /**
   * Het bestand is alleen een beeldmerk (icoon); zet het woordmerk ernaast.
   * Voor merken zonder horizontaal logo-bestand.
   */
  metNaam?: boolean
}

export interface MailHuisstijl {
  slug: string
  /** Zoals het merk zichzelf schrijft, in zinshoofdletters waar het merk dat doet (Noord, Kleurenlens). */
  naam: string
  url: string
  kleuren: MailKleuren
  /** Een font-stack die zonder webfont terugvalt op iets passends: webfonts laden in de meeste clients niet. */
  lettertype: string
  kopLettertype?: string
  /** null = woordmerk als tekst. */
  logo: MailLogo | null
  /**
   * Vertrouwde HTML voor het woordmerk als tekst, voor merken waarvan het
   * woordmerk zelf typografie is (mydailyfit met de gekleurde punt,
   * SuppleMind in twee tinten). Zonder dit: de naam, geëscapet.
   */
  woordmerk?: string
  /**
   * Een gekleurde kopbalk boven de kaart, voor een logo dat voor donkere grond
   * is gemaakt. Zonder dit staat het logo los op de achtergrond.
   */
  kop?: { achtergrond: string; tekst: string }
  knopRadius?: number
  /** Standaard afzender voor mail uit naam van dit merk: `Naam <adres>`. */
  afzender?: string
}

/**
 * De omhulling en bouwstenen van een vlootmail.
 *
 * Mail is geen web: Outlook (Word-renderer) kent geen flex, grid of max-width,
 * Gmail gooit `<style>` weg zodra een mail wordt doorgestuurd of in een
 * niet-Gmail-account wordt gelezen, en geen enkele grote client toont SVG.
 * Daarom hier: tabellen voor de opmaak, álle stijl inline, het logo als PNG op
 * een absolute https-URL met vaste breedte en hoogte, en een knop die ook in
 * Outlook een gekleurd vlak blijft (de kleur op de cel, niet alleen op de link).
 *
 * Alles wat tekst van buiten interpoleert, escapet. Wat als `html` binnenkomt
 * (inhoud, voet) is vertrouwde opmaak van de aanroeper — die is zelf
 * verantwoordelijk voor het escapen van wat daarin van een ander komt; gebruik
 * daarvoor `esc` of `tekstAlsHtml`.
 */

export function esc(waarde: string): string {
  return waarde
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Alleen http(s) en mailto mogen een link worden. Een `javascript:` of
 * `data:`-URL voert in een mailclient niets uit, maar wordt na een klik wél in
 * de browser geopend — en een knop in onze huisstijl is precies het soort
 * vertrouwen dat een phishinglink nodig heeft.
 */
export function veiligeHref(href: string): string {
  const schoon = href.trim()
  return /^(https?:\/\/|mailto:)/i.test(schoon) ? schoon : '#'
}

/** Inline stijlen per element, voor opmaak die de aanroeper zelf rendert (markdown). */
export function elementStijlen(s: MailHuisstijl): Record<string, string> {
  const k = s.kleuren
  const kop = `font-family:${s.kopLettertype ?? s.lettertype};color:${k.tekst};font-weight:600;`
  return {
    h1: `${kop}font-size:22px;line-height:1.3;margin:0 0 16px`,
    h2: `${kop}font-size:19px;line-height:1.35;margin:24px 0 8px`,
    h3: `${kop}font-size:16px;line-height:1.4;margin:20px 0 8px`,
    p: `margin:0 0 16px;font-size:15px;line-height:1.6;color:${k.tekst}`,
    li: `margin:0 0 6px;font-size:15px;line-height:1.6;color:${k.tekst}`,
    ul: 'margin:0 0 16px;padding:0 0 0 22px',
    ol: 'margin:0 0 16px;padding:0 0 0 22px',
    a: `color:${k.link};text-decoration:underline`,
    blockquote: `margin:0 0 16px;padding:4px 0 4px 14px;border-left:3px solid ${k.rand};color:${k.gedempt}`,
    hr: `border:0;border-top:1px solid ${k.rand};margin:24px 0`,
    code: `font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;background:${k.achtergrond};padding:1px 4px;border-radius:3px`,
    th: `text-align:left;padding:6px 8px;border-bottom:1px solid ${k.rand};font-size:13px;color:${k.gedempt};font-weight:600`,
    td: `padding:6px 8px;border-bottom:1px solid ${k.rand};font-size:14px;vertical-align:top;color:${k.tekst}`,
  }
}

export function kop(s: MailHuisstijl, tekst: string): string {
  return `<h1 style="${elementStijlen(s).h1}">${esc(tekst)}</h1>`
}

/** Een alinea. `html` is vertrouwde opmaak — escape zelf wat van een ander komt. */
export function alinea(s: MailHuisstijl, html: string): string {
  return `<p style="${elementStijlen(s).p}">${html}</p>`
}

/** Kleine, gedempte tekst voor geldigheid, uitleg en "niet aangevraagd?". */
export function klein(s: MailHuisstijl, html: string): string {
  return `<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:${s.kleuren.gedempt}">${html}</p>`
}

export function link(s: MailHuisstijl, href: string, label: string): string {
  return `<a href="${esc(veiligeHref(href))}" style="${elementStijlen(s).a}">${esc(label)}</a>`
}

/**
 * De primaire actie, in de accentkleur van het merk. De kleur staat op de cel
 * (`bgcolor`) én op de link: Outlook negeert padding en achtergrond op een
 * `<a>`, en zonder de cel wordt de knop daar een kale onderstreepte link.
 */
export function knop(s: MailHuisstijl, href: string, label: string): string {
  const h = esc(veiligeHref(href))
  const k = s.kleuren
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px"><tr>
<td bgcolor="${k.accent}" style="background:${k.accent};border-radius:${s.knopRadius ?? 8}px">
<a href="${h}" style="display:inline-block;padding:12px 22px;font-family:${s.lettertype};font-size:15px;font-weight:600;line-height:1.2;color:${k.opAccent};text-decoration:none;border-radius:${s.knopRadius ?? 8}px">${esc(label)}</a>
</td></tr></table>`
}

/** Knop plus de kale link eronder, voor mail waarin de link móet werken (verificatie, herstel). */
export function knopMetTerugval(s: MailHuisstijl, href: string, label: string): string {
  return (
    knop(s, href, label) +
    klein(
      s,
      `Werkt de knop niet? Plak deze link in je browser:<br><span style="word-break:break-all">${esc(veiligeHref(href))}</span>`,
    )
  )
}

const URL_IN_TEKST = /https?:\/\/[^\s<>"')]+/g

/**
 * Platte tekst (een alert, een herinnering) als HTML in de huisstijl: lege
 * regel = nieuwe alinea, enkele regelovergang = `<br>`, kale URL's worden een
 * link. Alles wordt eerst geëscapet, dus andermans tekst — een foutmelding,
 * een titel uit een feed — kan geen opmaak of eigen link toevoegen.
 */
export function tekstAlsHtml(s: MailHuisstijl, tekst: string): string {
  return tekst
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((blok) => blok.trim())
    .filter(Boolean)
    .map((blok) => {
      // Splitsen op de RUWE tekst en elk stuk apart escapen: wie eerst escapet
      // en dan URL's zoekt, trekt een `&quot;` achter een URL de href in.
      let html = ''
      let vanaf = 0
      for (const m of blok.matchAll(URL_IN_TEKST)) {
        const url = m[0]
        html += esc(blok.slice(vanaf, m.index))
        html += `<a href="${esc(url)}" style="${elementStijlen(s).a};word-break:break-all">${esc(url)}</a>`
        vanaf = m.index + url.length
      }
      html += esc(blok.slice(vanaf))
      return `<p style="${elementStijlen(s).p}">${html.replace(/\n/g, '<br>')}</p>`
    })
    .join('\n')
}

export interface MailInvoer {
  onderwerp: string
  /** Vertrouwde HTML voor in de kaart. Bouw hem met de bouwstenen hierboven. */
  inhoud: string
  /** Korte tekst die de inbox naast het onderwerp toont. Onzichtbaar in de mail zelf. */
  voorvertoning?: string
  /** Vertrouwde HTML onder de kaart (afmeldlinks, waarom-je-dit-krijgt). */
  voet?: string
  /** 680 px in plaats van 560: voor rapportages met een tabel. */
  breed?: boolean
}

function woordmerk(s: MailHuisstijl, grootte: number): string {
  return `<a href="${esc(veiligeHref(s.url))}" style="font-family:${s.kopLettertype ?? s.lettertype};font-size:${grootte}px;font-weight:700;letter-spacing:0.01em;line-height:1.2;color:${s.kop?.tekst ?? s.kleuren.tekst};text-decoration:none">${s.woordmerk ?? esc(s.naam)}</a>`
}

function logoBlok(s: MailHuisstijl): string {
  const href = esc(veiligeHref(s.url))
  const l = s.logo
  // Geen logo-bestand: het woordmerk als tekst, in de koptekstkleur van het merk.
  if (!l) return woordmerk(s, 20)
  const img = `<a href="${href}" style="text-decoration:none"><img src="${esc(l.src)}" width="${l.breedte}" height="${l.hoogte}" alt="${l.metNaam ? '' : esc(s.naam)}" style="display:block;border:0;outline:none;width:${l.breedte}px;height:${l.hoogte}px;max-width:100%;font-family:${s.lettertype};font-size:18px;font-weight:600;color:${s.kop?.tekst ?? s.kleuren.tekst}"></a>`
  if (!l.metNaam) return img
  // Beeldmerk + woordmerk naast elkaar; een tabel, want Outlook kent geen flex.
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding:0 10px 0 0;vertical-align:middle">${img}</td>
<td style="vertical-align:middle">${woordmerk(s, 19)}</td>
</tr></table>`
}

/** Ruwe helderheid (0–1) van een #rrggbb-kleur, genoeg om licht van donker te scheiden. */
function helderheid(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function domein(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

/**
 * De volledige mail: kop met logo, kaart met inhoud, voet met merk en domein.
 *
 * Het kleurschema wordt aangekondigd (licht óf donker, naar de achtergrond
 * van het merk) en niet "beide": een client die zelf gaat inverteren maakt van
 * een navy logo op wit een navy logo op zwart, en van een donkere C37-mail een
 * grijze brij.
 */
export function renderMail(s: MailHuisstijl, invoer: MailInvoer): string {
  const k = s.kleuren
  const breedte = invoer.breed ? 680 : 560
  const schema = helderheid(k.achtergrond) < 0.4 ? 'dark' : 'light'
  const kopAchtergrond = s.kop?.achtergrond
  const voorvertoning = invoer.voorvertoning
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${k.achtergrond};opacity:0">${esc(invoer.voorvertoning)}${'&#847;&zwnj;&nbsp;'.repeat(40)}</div>`
    : ''
  const kopRij = kopAchtergrond
    ? `<tr><td bgcolor="${kopAchtergrond}" style="background:${kopAchtergrond};padding:20px 32px;border-radius:12px 12px 0 0">${logoBlok(s)}</td></tr>`
    : `<tr><td style="padding:8px 4px 20px">${logoBlok(s)}</td></tr>`
  const kaartRadius = kopAchtergrond ? '0 0 12px 12px' : '12px'
  const kaartRand = kopAchtergrond ? `border:1px solid ${k.rand};border-top:0` : `border:1px solid ${k.rand}`
  const voet = invoer.voet ? `<div style="margin:0 0 8px">${invoer.voet}</div>` : ''

  return `<!DOCTYPE html>
<html lang="nl" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="${schema}">
<meta name="supported-color-schemes" content="${schema}">
<title>${esc(invoer.onderwerp)}</title>
<style>:root{color-scheme:${schema};supported-color-schemes:${schema}}@media (max-width:600px){.vloot-kaart{padding:24px 20px!important}}</style>
</head>
<body style="margin:0;padding:0;background:${k.achtergrond};-webkit-text-size-adjust:100%">
${voorvertoning}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${k.achtergrond}" style="background:${k.achtergrond}">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="${breedte}" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${breedte}px;font-family:${s.lettertype};color:${k.tekst}">
${kopRij}
<tr><td class="vloot-kaart" bgcolor="${k.kaart}" style="background:${k.kaart};${kaartRand};border-radius:${kaartRadius};padding:32px;font-family:${s.lettertype};font-size:15px;line-height:1.6;color:${k.tekst}">
${invoer.inhoud}
</td></tr>
<tr><td style="padding:20px 8px 0;font-family:${s.lettertype};font-size:12px;line-height:1.6;color:${k.gedempt};text-align:center">
${voet}<a href="${esc(veiligeHref(s.url))}" style="color:${k.gedempt};text-decoration:none">${esc(s.naam)} &middot; ${esc(domein(s.url))}</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

/** De huisstijl van SpatialLab. */
export const HUISSTIJL: MailHuisstijl = {
  "slug": "spatiallab",
  "naam": "SpatialLab",
  "url": "https://spatiallab.app",
  "lettertype": "Geist,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  "kleuren": {
    "achtergrond": "#F5F4EF",
    "kaart": "#FDFCF9",
    "tekst": "#171610",
    "gedempt": "#5B594F",
    "rand": "#D8D5C8",
    "accent": "#BC3F00",
    "opAccent": "#FFFFFF",
    "link": "#BC3F00"
  },
  "logo": {
    "src": "https://atthis.ai/mail/spatiallab.png",
    "breedte": 170,
    "hoogte": 32
  }
}
