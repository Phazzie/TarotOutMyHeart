<script lang="ts">
  /**
   * @fileoverview Lobby of the Bureau of Fate (home page)
   * @purpose Explain the service as a government office would, and hand the applicant a
   *   ticket. The ticket dispenser is the call to action: pulling it goes to Window 1.
   * @dataFlow Ticket pull → short tear animation → goto('/upload'). Works as a plain link
   *   without JavaScript.
   * @updated 2026-11-27
   */
  import { goto } from '$app/navigation'
  import TarotCardFrame from '$lib/components/TarotCardFrame.svelte'

  let isFlipped = $state(false)
  let ticket = $state<string | null>(null)

  // The specimen's back carries a serial number, like any document worth forging.
  const serial = 'MA-0000-' + String(new Date().getFullYear())

  function takeNumber(event: MouseEvent) {
    if (ticket) return
    event.preventDefault()
    ticket = String(Math.floor(Math.random() * 90) + 10)
    setTimeout(() => goto('/upload'), 900)
  }
</script>

<svelte:head>
  <title>Bureau of Fate · Tarot deck issuance</title>
  <meta
    name="description"
    content="Apply for your own 22-card Major Arcana tarot deck. Submit photos of the look you want; the Bureau's clerk drafts and illustrates every card."
  />
</svelte:head>

<div class="lobby">
  <section class="notice sheet" aria-labelledby="notice-title">
    <span class="pin pin-l" aria-hidden="true"></span>
    <span class="pin pin-r" aria-hidden="true"></span>
    <p class="notice-kicker">Public notice · Effective immediately</p>
    <h1 id="notice-title">Your fate is a 22-card deck.<br />You may now apply for one.</h1>
    <p class="notice-body">
      Show the Bureau a few photos of the look you want. A clerk drafts a case file for each of the
      22 Major Arcana, from The Fool to The World, and has every card illustrated in your style. You
      leave with a deck no one else has.
    </p>
    <p class="notice-sign">— The Office of Major Arcana Issuance</p>
  </section>

  <section class="dispenser-wrap" aria-label="Take a number">
    <div class="dispenser">
      <p class="dispenser-label">Please take a number</p>
      <a href="/upload" class="dispenser-pull" onclick={takeNumber} aria-label="Take a number">
        <span class="pull-text">{ticket ? 'Proceed to Window 1' : 'Pull'}</span>
      </a>
      <div class="slot" aria-hidden="true">
        {#if ticket}
          <div class="ticket">
            <span class="ticket-head">Bureau of Fate</span>
            <span class="ticket-no">{ticket}</span>
            <span class="ticket-foot">Window 1 · Intake</span>
          </div>
        {/if}
      </div>
    </div>
    <p class="dispenser-note">Average wait: about two minutes. The clerk does not take breaks.</p>
  </section>

  <section class="instructions sheet" aria-labelledby="howto">
    <h2 id="howto">Instructions to applicants</h2>
    <ol>
      <li>
        <span class="step-no">Window 1</span>
        <div>
          <h3>Intake</h3>
          <p>
            Submit 1 to 5 photos as exhibits of the look you want: a painting, a room, a jacket,
            your cat. Then file a Declaration of Aesthetic: theme, tone, and a few sentences in your
            own words.
          </p>
        </div>
      </li>
      <li>
        <span class="step-no">Window 2</span>
        <div>
          <h3>Processing</h3>
          <p>
            The clerk studies your exhibits and drafts a case file for each card. Read them, amend
            any you like, then send all 22 to be illustrated. Cards are processed one at a time; any
            that come back rejected can be resubmitted.
          </p>
        </div>
      </li>
      <li>
        <span class="step-no">Window 3</span>
        <div>
          <h3>Issuance</h3>
          <p>
            Collect your deck: inspect each card, take them singly, or take certified copies of all
            22 in one .zip.
          </p>
        </div>
      </li>
    </ol>
  </section>

  <section class="specimen-wrap" aria-labelledby="specimen-title">
    <h2 id="specimen-title" class="wall-label">Specimen on display</h2>
    <div class="specimen">
      <TarotCardFrame
        {isFlipped}
        cardName="Specimen: 0, The Fool"
        onClick={() => (isFlipped = !isFlipped)}
      >
        {#snippet front()}
          <div class="face front">
            <span class="corner">0</span>
            <svg class="fool-art" viewBox="0 0 200 240" aria-hidden="true">
              <rect width="200" height="240" fill="#f3e6c4" />
              <circle cx="150" cy="58" r="26" fill="#e7b14a" />
              <path d="M0 190 L95 150 L120 240 L0 240 Z" fill="#6f7f5a" />
              <path d="M95 150 L120 240 L200 240 L200 205 L140 175 Z" fill="#2f3b2a" />
              <path d="M84 150 q-6 -26 4 -46 q6 -10 16 -6 q8 6 2 20 l-6 30 z" fill="#b8312f" />
              <circle cx="98" cy="92" r="9" fill="#f1d3b3" />
              <path d="M90 84 q8 -14 18 0" fill="#22201c" />
              <path d="M104 112 l34 -22" stroke="#22201c" stroke-width="3" />
              <circle cx="140" cy="88" r="7" fill="#c9ad6c" />
              <path d="M66 166 q6 -12 14 -4 q4 -8 10 0 l-4 12 z" fill="#f5f0e1" />
              <path d="M70 120 l-12 -10" stroke="#22201c" stroke-width="3" />
              <circle cx="56" cy="108" r="5" fill="#f5f0e1" stroke="#22201c" />
            </svg>
            <span class="face-title">The Fool</span>
            <span class="specimen-stamp" aria-hidden="true">Specimen</span>
          </div>
        {/snippet}
        {#snippet back()}
          <div class="face back">
            <div class="guilloche" aria-hidden="true"></div>
            <span class="back-title">Certificate of Arcana</span>
            <span class="back-serial">No. {serial}</span>
            <span class="back-small">Not valid for divination.<br />Issued for display only.</span>
          </div>
        {/snippet}
      </TarotCardFrame>
    </div>
    <p class="placard">
      <strong>0 · The Fool.</strong> Beginnings, a leap, trusting the drop. Every deck the Bureau issues
      starts with this card. Click to see the back.
    </p>
  </section>

  <section class="fees sheet" aria-labelledby="fees-title">
    <h2 id="fees-title">Schedule of fees</h2>
    <table>
      <tbody>
        <tr><td>Drafting 22 case files</td><td>about $0.10</td></tr>
        <tr><td>Illustrating 22 cards ($0.10 each)</td><td>$2.20</td></tr>
        <tr class="total"><td>Charged to applicant</td><td>$0.00</td></tr>
      </tbody>
    </table>
    <p class="fees-note">
      The Bureau pays the clerk in Grok credits and absorbs the cost, grudgingly. Please don't apply
      400 times.
    </p>
  </section>
</div>

<style>
  .lobby {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
    grid-template-areas:
      'notice dispenser'
      'instructions specimen'
      'fees specimen';
    gap: 2rem;
    align-items: start;
  }

  /* ---------- Notice ---------- */
  .notice {
    grid-area: notice;
    padding: 2.25rem 2.25rem 1.75rem;
    background:
      repeating-linear-gradient(transparent 0 31px, var(--paper-rule) 31px 32px), var(--paper);
    transform: rotate(-0.6deg);
  }

  .pin {
    position: absolute;
    top: 10px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #ff8a7a, #9b1d14);
    box-shadow: 0 2px 2px rgba(0, 0, 0, 0.4);
  }

  .pin-l {
    left: 14px;
  }

  .pin-r {
    right: 14px;
  }

  .notice-kicker {
    font-family: var(--font-heading);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.8rem;
    color: var(--stamp-red);
    margin-bottom: 0.75rem;
  }

  .notice h1 {
    font-size: clamp(2rem, 4.2vw, 3.4rem);
    line-height: 1.02;
    text-transform: uppercase;
    font-weight: 700;
    margin-bottom: 1.25rem;
  }

  .notice-body {
    font-family: var(--font-typed);
    font-size: 1.1rem;
    line-height: 2rem;
    max-width: 52ch;
  }

  .notice-sign {
    margin-top: 1rem;
    font-style: italic;
    color: var(--ink-soft);
  }

  /* ---------- Ticket dispenser ---------- */
  .dispenser-wrap {
    grid-area: dispenser;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .dispenser {
    position: relative;
    width: 220px;
    padding: 1.25rem 1rem 2.5rem;
    background: linear-gradient(160deg, #d8392b, #a3241a);
    border-radius: 22px 22px 40px 40px;
    box-shadow:
      inset 0 -8px 0 rgba(0, 0, 0, 0.2),
      0 14px 24px -10px rgba(0, 0, 0, 0.6);
    text-align: center;
  }

  .dispenser-label {
    font-family: var(--font-heading);
    color: #fff3dc;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 600;
    font-size: 0.95rem;
    margin-bottom: 0.9rem;
  }

  .dispenser-pull {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 84px;
    padding: 0.5rem;
    border-radius: 12px;
    background: #fff3dc;
    color: var(--stamp-red);
    font-family: var(--font-heading);
    font-size: 1.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-decoration: none;
    box-shadow: inset 0 -5px 0 #e2cfa7;
    transition: transform var(--transition-fast);
  }

  .dispenser-pull:hover {
    transform: translateY(2px);
  }

  .pull-text {
    line-height: 1.05;
  }

  .slot {
    position: absolute;
    left: 50%;
    bottom: -6px;
    width: 120px;
    height: 10px;
    transform: translateX(-50%);
    background: #4c0f0a;
    border-radius: 4px;
    overflow: visible;
  }

  .ticket {
    position: absolute;
    top: 4px;
    left: 8px;
    width: 104px;
    padding: 0.4rem 0.3rem 0.5rem;
    background: #fbf3df;
    border: 1px dashed #b9a982;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: var(--font-heading);
    color: var(--ink);
    animation: dispense 0.6s ease-out both;
    box-shadow: 0 6px 10px rgba(0, 0, 0, 0.3);
  }

  .ticket-head,
  .ticket-foot {
    font-size: 0.55rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .ticket-no {
    font-size: 2.2rem;
    font-weight: 700;
    line-height: 1;
  }

  @keyframes dispense {
    from {
      transform: translateY(-80%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .dispenser-note {
    margin-top: 4.5rem;
    color: #c9c3a8;
    font-size: 0.85rem;
    text-align: center;
    max-width: 24ch;
  }

  /* ---------- Instructions ---------- */
  .instructions {
    grid-area: instructions;
    padding: 1.75rem 2rem;
  }

  .instructions h2,
  .fees h2 {
    font-size: 1.1rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    border-bottom: 2px solid var(--ink);
    padding-bottom: 0.4rem;
    margin-bottom: 1rem;
  }

  .instructions ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .instructions li {
    display: grid;
    grid-template-columns: 6.5rem 1fr;
    gap: 1rem;
  }

  .step-no {
    align-self: start;
    padding: 0.3rem 0.4rem;
    border: 2px solid var(--stamp-blue);
    color: var(--stamp-blue);
    font-family: var(--font-heading);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-align: center;
    font-size: 0.85rem;
  }

  .instructions h3 {
    font-size: 1.05rem;
    text-transform: uppercase;
    margin-bottom: 0.25rem;
  }

  .instructions p {
    font-size: 0.95rem;
    color: var(--ink-soft);
  }

  /* ---------- Specimen ---------- */
  .specimen-wrap {
    grid-area: specimen;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .wall-label {
    color: #d9d2b6;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
  }

  .specimen {
    width: min(260px, 70vw);
    padding: 14px;
    background: #1a120c;
    border: 6px solid #6b4a2a;
    box-shadow: 0 16px 30px -10px rgba(0, 0, 0, 0.7);
  }

  .face {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
  }

  .front {
    background: #f3e6c4;
    padding: 8% 7%;
    gap: 6%;
  }

  .corner {
    align-self: flex-start;
    font-family: var(--font-tarot);
    font-size: 1.1rem;
  }

  .fool-art {
    width: 100%;
    flex: 1;
    border: 2px solid var(--ink);
  }

  .face-title {
    font-family: var(--font-tarot);
    font-size: 1.05rem;
    letter-spacing: 0.04em;
  }

  .specimen-stamp {
    position: absolute;
    top: 42%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-24deg);
    padding: 0.15rem 0.6rem;
    border: 3px solid var(--stamp-red);
    color: var(--stamp-red);
    font-family: var(--font-heading);
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    opacity: 0.85;
    mix-blend-mode: multiply;
  }

  .back {
    justify-content: center;
    gap: 0.5rem;
    background: #e4ecdf;
    color: #1f3a2b;
    text-align: center;
    padding: 10%;
  }

  .guilloche {
    position: absolute;
    inset: 6%;
    border: 2px solid #1f3a2b;
    background:
      repeating-radial-gradient(
        circle at 50% 50%,
        transparent 0 6px,
        rgba(31, 58, 43, 0.18) 6px 7px
      ),
      repeating-linear-gradient(45deg, transparent 0 9px, rgba(31, 58, 43, 0.12) 9px 10px);
  }

  .back-title,
  .back-serial,
  .back-small {
    position: relative;
    background: #e4ecdf;
    padding: 0.1rem 0.4rem;
  }

  .back-title {
    font-family: var(--font-heading);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
  }

  .back-serial {
    font-family: var(--font-typed);
    font-size: 0.85rem;
  }

  .back-small {
    font-size: 0.7rem;
  }

  .placard {
    max-width: 30ch;
    padding: 0.75rem 0.9rem;
    background: #f2ecd9;
    border: 1px solid #b8ab88;
    font-size: 0.85rem;
    color: var(--ink);
  }

  /* ---------- Fees ---------- */
  .fees {
    grid-area: fees;
    padding: 1.5rem 2rem;
    background: var(--carbon-yellow);
    border-color: #d7c35c;
  }

  .fees table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95rem;
  }

  .fees td {
    padding: 0.35rem 0;
    border-bottom: 1px dotted rgba(0, 0, 0, 0.35);
  }

  .fees td:last-child {
    text-align: right;
    font-family: var(--font-typed);
  }

  .fees .total td {
    font-weight: 700;
    border-bottom: 3px double var(--ink);
  }

  .fees-note {
    margin-top: 0.75rem;
    font-size: 0.85rem;
    color: #4a3f13;
  }

  @media (max-width: 860px) {
    .lobby {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas:
        'notice'
        'dispenser'
        'instructions'
        'specimen'
        'fees';
      gap: 1.5rem;
    }

    .notice {
      padding: 1.75rem 1.25rem 1.25rem;
      transform: none;
    }

    .instructions,
    .fees {
      padding: 1.25rem;
    }

    .instructions li {
      grid-template-columns: 1fr;
      gap: 0.4rem;
    }

    .step-no {
      justify-self: start;
    }
  }
</style>
