// Built-in sample transcripts so anyone can try MinuteMind in one click.
// Sample 1 is short (on-device path), sample 2 is long (cloud-first path).

export const SAMPLES = [
  {
    id: 'standup',
    label: 'Sample: weekly standup (short)',
    title: 'Weekly product standup — Nov 24',
    text: `Maya opened the standup by reminding everyone that the checkout redesign freezes on Friday, so any copy changes after that need Priya's approval. The team agreed to ship the new payment form first and hold the loyalty points banner for the next sprint, because the banner still needs legal review. Dan reported that the slow search bug is fixed, it was a missing database index, and search is now twice as fast in staging. Priya will send the final onboarding email copy to Maya by Wednesday. Dan will deploy the payment form to staging by tomorrow so QA can test it. Maya decided the team will demo the checkout flow to the founders on Thursday at 10am. Everyone agreed to keep the daily standup at 15 minutes and move longer debates to a separate thread.`,
  },
  {
    id: 'client-call',
    label: 'Sample: client call — website redesign (long)',
    title: 'Client call — Northwind Bakery website redesign',
    text: `Sara (Northwind Bakery): Thanks for joining. Our current site was built in 2019, it looks dated, and half our customers tell us they can't find the catering menu on their phones. We need a redesign before the holiday season, so the hard deadline is December 12th. The most important thing is online ordering for cakes — right now people have to phone us, and we lose orders every weekend because nobody answers on Sundays.
Alex (design): That makes sense. We can build the ordering flow first and treat the catering pages as phase two. Do you have photos of the cakes? The current site uses stock photos and customers notice.
Sara: Yes, our photographer is coming Thursday. We will have forty new photos by next Monday. I will send you the best twenty by Tuesday so you can start with real images.
Alex: Perfect. We agreed the new site will have three things on the homepage: the cake builder, the weekly specials, and the catering enquiry form. Everything else moves to the menu pages.
Maya (dev): From the technical side, the ordering flow needs a delivery date picker and a deposit payment. I recommend we use the payment provider you already have, so there is no new contract to sign. The team decided to keep the existing provider and avoid migrating payments mid-season.
Sara: Good, because our accountant would kill us if we changed providers now. One more thing: the site must be in English and Spanish. About a third of our customers prefer Spanish, and the current site is English only.
Alex: Noted. We will build the site with both languages from the start, not as an afterthought, because translating later always costs more. Maya will confirm the translation workflow with your team by Friday.
Maya: I will also need access to your current hosting by Monday so I can check what we can reuse. Sara will send the hosting login by Monday morning.
Sara: I will do that. Also, we need a way for the shop staff to update the weekly specials themselves without calling a developer every time. That was the biggest frustration with the old site.
Alex: We can add a simple editor for specials and opening hours. I will include a short training video for your staff when we hand over. The team agreed the handover will include a 30 minute training call and a one page guide.
Sara: That sounds great. Budget-wise, we agreed on the fixed price we discussed, with the deposit paid this week. I will send the deposit by Thursday so work can start on Friday.
Maya: To summarise, the launch date is December 12th, the cake ordering flow comes first, photos arrive next Monday, and the site will be bilingual from day one. Alex will send the design mockups for the homepage by next Wednesday. Maya will set up the staging site by Friday so you can watch progress. Sara will send the deposit by Thursday and the hosting login by Monday.
Sara: One risk to flag: if the photos are late, the homepage will look empty. We agreed that if photos slip past Tuesday, we launch with the ten best photos we already have and add the rest later, rather than delaying the launch.
Alex: Agreed. We will also add a simple contact form for wedding cakes, because those are your highest value orders and right now there is no way to enquire about them online. Sara will write the wedding cake questions by next Monday.
Maya: Finally, we decided the site will be hosted on the same provider you already use, to keep costs down, and we will add basic analytics so you can see which cakes people look at most. I will send the analytics report in the first week after launch.`,
  },
];
