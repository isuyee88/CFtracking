import React from 'react';
import { HelpCircle, Search, MessageSquare, BookOpen, LifeBuoy, ChevronRight, Mail, Phone, ExternalLink } from 'lucide-react';

const categories = [
  { icon: BookOpen, title: "Getting Started", description: "Learn the basics of Financial Atelier and how to set up your account." },
  { icon: LifeBuoy, title: "Payouts & Billing", description: "Everything you need to know about your earnings and withdrawal methods." },
  { icon: HelpCircle, title: "Affiliate Program", description: "Detailed information about our referral tiers and commission structure." },
  { icon: MessageSquare, title: "Campaigns & Marketing", description: "Tips and tricks for successful marketing initiatives and tracking." },
];

const faqs = [
  { question: "How do I request a payout?", answer: "Go to the Payouts tab, select your preferred withdrawal method, and click 'Request Payout'. Minimum payout is $50.00." },
  { question: "What is the referral tier system?", answer: "Our system has 4 tiers: Bronze, Silver, Gold, and Platinum. Higher tiers offer increased commission rates and exclusive bonuses." },
  { question: "How are conversions tracked?", answer: "We use advanced cookie tracking and server-side postbacks to ensure 100% accuracy in conversion attribution." },
  { question: "Can I use my own marketing materials?", answer: "Yes, but they must be approved by our compliance team. You can upload them in the Creative Assets tab for review." },
];

export const HelpCenter = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-display font-black tracking-tighter text-primary uppercase italic">Help Center</h1>
        <p className="text-on-surface-variant/60 font-medium max-w-2xl mx-auto">Find answers to your questions or get in touch with our support team.</p>
        <div className="relative max-w-xl mx-auto mt-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={20} />
          <input 
            type="text" 
            placeholder="Search for help..." 
            className="w-full pl-12 pr-4 py-4 bg-surface-container border border-outline-variant focus:border-secondary outline-none transition-colors text-lg whisper-shadow"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((cat, i) => (
          <div key={i} className="bg-surface-container p-8 border-b-4 border-secondary whisper-shadow hover:-translate-y-1 transition-transform cursor-pointer group">
            <div className="p-3 bg-secondary/10 text-secondary w-fit mb-6 group-hover:bg-secondary group-hover:text-white transition-colors">
              <cat.icon size={24} />
            </div>
            <h3 className="text-lg font-display font-bold text-primary mb-2 italic">{cat.title}</h3>
            <p className="text-xs text-on-surface-variant/60 leading-relaxed">{cat.description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <h2 className="text-2xl font-display font-black text-primary uppercase italic">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-surface-container p-6 whisper-shadow border border-outline-variant">
                <h3 className="font-bold text-primary mb-2 flex items-center justify-between">
                  {faq.question}
                  <ChevronRight size={18} className="text-on-surface-variant/40" />
                </h3>
                <p className="text-sm text-on-surface-variant/60 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <h2 className="text-2xl font-display font-black text-primary uppercase italic text-center lg:text-left">Still Need Help?</h2>
          <div className="bg-primary p-8 rounded-sm text-on-primary space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary text-on-primary">
                <Mail size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-primary/60">Email Support</p>
                <p className="font-bold">support@atelier.com</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary text-on-primary">
                <Phone size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-primary/60">Phone Support</p>
                <p className="font-bold">+1 (800) 123-4567</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary text-on-primary">
                <MessageSquare size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-primary/60">Live Chat</p>
                <p className="font-bold">Chat with an Expert</p>
              </div>
            </div>
            <button className="w-full py-3 bg-secondary text-on-primary font-bold uppercase tracking-widest hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2">
              Contact Us
              <ExternalLink size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
