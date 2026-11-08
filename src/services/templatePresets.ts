export type PresetTemplate = {
  id: string;
  category: "missed_call" | "call_ended" | "festival" | "offer" | "clinic" | "sweets";
  title: string;
  message: string;
};

export const PRESET_TEMPLATES: PresetTemplate[] = [
  // 📞 Missed Call Auto-Responders
  {
    id: "mc_general",
    category: "missed_call",
    title: "General Business Missed Call",
    message:
      "Hi {name}, thank you for calling {business_name}. I am currently busy with a client and could not pick up. I will call you back shortly. Check our catalog: {catalog_link}",
  },
  {
    id: "mc_clinic",
    category: "missed_call",
    title: "Clinic / Doctor Consulting",
    message:
      "Hello {name}, Dr. {owner_name} at {business_name} is currently consulting a patient. For appointments, please WhatsApp us at {whatsapp} or find our clinic here: {maps_link}",
  },
  {
    id: "mc_sweets",
    category: "missed_call",
    title: "Sweets / Bakery Busy Prep",
    message:
      "Namaste {name}! Thank you for calling {business_name}. We are busy preparing fresh batches! Check today's fresh menu & order online: {catalog_link} or WhatsApp {whatsapp}",
  },

  // 🤝 Post-Call Thank-You & Brand Cards
  {
    id: "ce_general",
    category: "call_ended",
    title: "General Brand Card & Thank You",
    message:
      "Thank you for speaking with {business_name}! It was great connecting with you. Save our contact: {phone} | Catalog: {catalog_link} | Location: {maps_link}. Have a great day!",
  },
  {
    id: "ce_clinic",
    category: "call_ended",
    title: "Clinic Visit & Location Info",
    message:
      "Thank you for reaching out to {business_name}. Clinic address: {maps_link}. For follow-ups or report sharing, WhatsApp us at {whatsapp}. Stay healthy!",
  },
  {
    id: "ce_review",
    category: "call_ended",
    title: "Customer Feedback & Google Review",
    message:
      "Thank you for connecting with {business_name}! We strive to offer the best service. Please share your valuable experience with us: {catalog_link}",
  },

  // 🎆 Festival Broadcasts
  {
    id: "fest_diwali",
    category: "festival",
    title: "Diwali Festive Greeting & Offer",
    message:
      "🎉 ✦ 𝗦𝗣𝗘𝗖𝗜𝗔𝗟 𝗗𝗜𝗪𝗔𝗟𝗜 𝗢𝗙𝗙𝗘𝗥 ✦ 🎉\n✨ Wishing you & your family a Happy & Prosperous Diwali from all of us at {business_name}! Enjoy an exclusive 15% festive discount with coupon 𝗗𝗜𝗪𝗔𝗟𝗜𝟭𝟱.\nView offers: {catalog_link}",
  },
  {
    id: "fest_newyear",
    category: "festival",
    title: "New Year Celebration & Wishes",
    message:
      "🎆 ✦ 𝗛𝗔𝗣𝗣𝗬 𝗡𝗘𝗪 𝗬𝗘𝗔𝗥 ✦ 🎆\nFrom all of us at {business_name}! May this year bring happiness, success, and prosperity to you and your loved ones. Visit us for special celebrations: {maps_link}",
  },
  {
    id: "fest_eid",
    category: "festival",
    title: "Eid Mubarak Greetings",
    message:
      "🌙 ✦ 𝗘𝗜𝗗 𝗠𝗨𝗕𝗔𝗥𝗔𝗞 ✦ 🌙\nWishing you and your family peace, harmony, and joy from team {business_name}. Celebrate this blessed occasion with our festive collection: {catalog_link}",
  },

  // 🍬 Sweets / Food Special Offers
  {
    id: "sweets_fresh",
    category: "sweets",
    title: "Fresh Sweet Boxes Pre-Booking",
    message:
      "🍰 ✦ 𝗙𝗥𝗘𝗦𝗛 𝗦𝗪𝗘𝗘𝗧 𝗕𝗢𝗫𝗘𝗦 ✦ 🍰\nNamaste {name}! Fresh pure ghee Kaju Katli, Motichoor Laddoos & dry fruit gift boxes are ready at {business_name}!\n📞 WhatsApp: {whatsapp}\n📍 Store: {maps_link}",
  },

  // 🩺 Clinic & Healthcare
  {
    id: "clinic_camp",
    category: "clinic",
    title: "Health Checkup Camp Invitation",
    message:
      "🩺 ✦ 𝗙𝗥𝗘𝗘 𝗛𝗘𝗔𝗟𝗧𝗛 𝗖𝗔𝗠𝗣 ✦ 🩺\nHello {name}, Dr. {owner_name} at {business_name} invites you to a Free Comprehensive Health Checkup Camp this Saturday!\n💬 WhatsApp {whatsapp} to reserve your family's slot.\n📍 Clinic: {maps_link}",
  },

  // 🏷️ Retail & Flash Offers
  {
    id: "offer_weekend",
    category: "offer",
    title: "Weekend Flash Sale (Buy 2 Get 1)",
    message:
      "🛍️ ✦ 𝗪𝗘𝗘𝗞𝗘𝗡𝗗 𝗠𝗘𝗚𝗔 𝗦𝗔𝗟𝗘 ✦ 🛍️\n🔥 Flat 50% Off & Buy 2 Get 1 Free on all items this weekend only at {business_name}!\n📍 Store Location: {maps_link}\n🛒 Catalog: {catalog_link}",
  },
];

