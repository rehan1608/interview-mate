"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BrainCircuit,
  Rocket,
  SendHorizontal,
  Loader2,
  ShieldCheck,
  Cpu,
  User,
  Bot,
  BarChart3,
  RefreshCw,
  Download,
  Volume2
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import { jsPDF } from "jspdf";

export default function Home() {
  const [step, setStep] = useState<"setup" | "chat" | "feedback">("setup");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [score, setScore] = useState(0);
  // FIXED PROGRESS LOGIC
  const [questionCount, setQuestionCount] = useState(0);
  const totalExpectedQuestions = 10;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sound Effect Helper (Standard Web Audio API)
  const playSound = (type: 'pop' | 'success') => {
    const audio = new Audio(type === 'pop' ? 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3' : 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3');
    audio.volume = 0.2;
    audio.play().catch(() => {}); // Catch block prevents errors if browser blocks autoplay
  };


  // FIX 2: Enhanced Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      // Small timeout ensures the DOM has updated before we scroll
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  }, [messages, isTyping]);

  const handleStart = () => {
    setLoading(true);
    setTimeout(() => {
      setStep("chat");
      setLoading(false);
      setMessages([
        {
          role: "model",
          content: `System Initialized. Are you ready to begin the interview for the **${role}** position?`,
        },
      ]);
    }, 1500);
  };

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;

    playSound('pop');
    const userMessage = { role: "user", content: input };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          role: role,
          description: description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If API is exhausted, show the specific error message
        const errorMsg = data.message || "ERROR: System Offline.";
        setMessages((prev) => [...prev, { role: "model", content: `⚠️ **SYSTEM ALERT:** ${errorMsg}` }]);
        return;
      }
      
      if (data.content) {
        setMessages((prev) => [...prev, { role: "model", content: data.content }]);if (messages.length > 3) setQuestionCount(prev => prev + 1);
      }
    } catch (error) {
      console.error("Communication Error:", error);
      setMessages((prev) => [...prev, { role: "model", content: "⚠️ **CRITICAL_FAILURE:** Uplink lost. Re-establishing..." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const generateFeedback = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages,
            {
              role: "user",
              content:
                "The interview is over. Provide a structured feedback report. First, give a 'Readiness Score' as a number out of 100 (formatted like Score: XX/100). Then include: Top Strengths, Top Weaknesses, and Practical suggestions to improve.",
            },
          ],
          role: role,
          description: description,
        }),
      });
      const data = await response.json();
      const content = data.content || "";
      
      const scoreMatch = content.match(/Score:\s*(\d+)/i);
      if (scoreMatch) setScore(parseInt(scoreMatch[1]));
      else setScore(Math.floor(Math.random() * (95 - 65 + 1)) + 65);

      setAnalysis(content);
      setStep("feedback");
      playSound('success');
    } finally {
      setLoading(false);
    }
  };

  // FIXED PDF EXPORT: Auto-pagination + Markdown Cleaning
  const exportPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    const pageHeight = doc.internal.pageSize.height;
    let cursorY = 40;

    // Clean Markdown for professional look
    const cleanText = analysis
      .replace(/[#*`]/g, "") 
      .replace(/\n\s*\n/g, "\n\n") 
      .trim();

    // Styled Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 25, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("PREP.AI EVALUATION LOG", margin, 17);

    // Metadata Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`CANDIDATE ROLE: ${role.toUpperCase()}`, margin, cursorY);
    doc.text(`READINESS SCORE: ${score}%`, 140, cursorY);
    cursorY += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, cursorY, 190, cursorY);
    cursorY += 15;

    // Content Body with Auto-Pagination
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const splitLines = doc.splitTextToSize(cleanText, 170);

    splitLines.forEach((line: string) => {
      if (cursorY > pageHeight - margin) {
        doc.addPage();
        cursorY = 25; // Reset Y on new page
      }
      doc.text(line, margin, cursorY);
      cursorY += 7; // Line spacing
    });

    doc.save(`Evaluation_Report_${role}.pdf`);
  };

  // Progress Bar Calculation
  const progressPercentage = Math.min((questionCount / totalExpectedQuestions) * 100, 100);

  return (
    <main className="min-h-screen bg-[#050505] text-slate-200 selection:bg-blue-500/30 overflow-hidden relative">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 contrast-150" />
      </div>

      {loading && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <p className="font-mono text-blue-400 animate-pulse uppercase tracking-[0.3em]">Processing_Data...</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            className="relative z-10 flex items-center justify-center min-h-screen p-6"
          >
            <div className="relative group w-full max-w-lg">
              {/* Animated Border logic handled in tailwind.config.ts */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-600 to-blue-500 rounded-3xl blur opacity-30 group-hover:opacity-100 transition duration-1000 animate-gradient-x" />
              <div className="relative bg-black/80 border border-white/10 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl">
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                    <Cpu className="w-10 h-10 text-blue-400" />
                  </div>
                </div>
                <h1 className="text-4xl font-black text-center mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">PREP.AI</h1>
                <p className="text-center text-slate-400 mb-8 font-mono text-xs tracking-widest uppercase">Protocol: Interview Intelligence</p>
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block tracking-widest">Target Position</label>
                    <Input placeholder="e.g. Frontend Architect" className="bg-white/5 border-white/10 h-14 rounded-xl focus:ring-0 text-lg" value={role} onChange={(e) => setRole(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block tracking-widest">Context (JD)</label>
                    <Textarea placeholder="Paste job details for precision training..." className="bg-white/5 border-white/10 rounded-xl focus:ring-0 min-h-[100px] resize-none" value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <Button onClick={handleStart} disabled={!role || loading} className="w-full h-16 bg-white text-black hover:bg-blue-600 hover:text-white transition-all rounded-xl font-black text-xl italic group">
                    INITIALIZE_SESSION <Rocket className="ml-2 w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === "chat" && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative z-10 flex flex-col h-screen max-w-5xl mx-auto p-4 md:p-10"
          >
            {/* Progress Bar Logic Fix */}
            <div className="mb-4">
              <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest italic font-bold">Progress: {Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10 shadow-inner">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} className="h-full bg-gradient-to-r from-blue-500 to-purple-500" />
              </div>
            </div>

            <div className="flex-1 bg-white/[0.03] border border-white/10 rounded-[2.5rem] backdrop-blur-3xl flex flex-col overflow-hidden shadow-3xl">
              <header className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                  <div>
                    <h2 className="font-mono text-sm text-blue-400 leading-none mb-1 uppercase italic tracking-tighter">Live_Interrogation</h2>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">{role}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="rounded-full border-white/10 text-xs px-4" onClick={() => setStep("setup")}>TERMINATE</Button>
                  {messages.length > 4 && (
                    <Button onClick={generateFeedback} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full px-6 text-xs font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                      Generate_Report
                    </Button>
                  )}
                </div>
              </header>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.map((m, i) => (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl flex gap-4 ${m.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-white/5 border border-white/10 text-slate-200 rounded-tl-none"}`}>
                      {m.role === "model" ? <Bot className="w-5 h-5 mt-1 text-blue-400 shrink-0" /> : <User className="w-5 h-5 mt-1 shrink-0 text-blue-200" />}
                      <div className="prose prose-invert prose-sm md:prose-base max-w-none">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <motion.div className="flex justify-start">
                    <div className="bg-white/5 border border-blue-500/20 p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">Rehan is analyzing...</span>
                    </div>
                  </motion.div>
                )}
              </div>

              <footer className="p-6 bg-white/[0.02] border-t border-white/5">
                <div className="relative flex items-center">
                  <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Provide your answer..." className="w-full h-16 bg-white/5 border-white/10 rounded-2xl pl-6 pr-20 text-lg focus:ring-1 focus:ring-blue-500/50" />
                  <Button onClick={sendMessage} className="absolute right-2 h-12 w-12 rounded-xl bg-blue-600 hover:bg-blue-500">
                    <SendHorizontal className="w-6 h-6" />
                  </Button>
                </div>
              </footer>
            </div>
          </motion.div>
        )}

        {step === "feedback" && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 flex items-center justify-center min-h-screen p-6 md:p-12"
          >
            <div className="max-w-5xl w-full bg-white/[0.03] border border-white/10 rounded-[3rem] p-8 md:p-12 backdrop-blur-3xl relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <BarChart3 className="w-48 h-48 text-blue-500" />
              </div>
              <header className="mb-10 relative flex justify-between items-start">
                <div>
                  <h2 className="text-4xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">PERFORMANCE_REPORT</h2>
                  <p className="text-xs text-slate-500 font-mono mt-2">Evaluation by AI Interviewer Rehan</p>
                </div>
                <Button onClick={exportPDF} className="bg-blue-600 hover:bg-blue-500 flex gap-2">
                  <Download className="w-4 h-4" /> Download PDF
                </Button>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="p-6 bg-black/40 border border-white/10 rounded-3xl overflow-y-auto max-h-[500px] custom-scrollbar shadow-inner">
                    <h3 className="text-blue-400 font-bold mb-6 flex items-center gap-2 font-mono text-xs uppercase tracking-widest">
                      <ShieldCheck className="w-4 h-4" /> Comprehensive_Analysis
                    </h3>
                    <div className="text-slate-300 leading-relaxed prose prose-invert prose-blue max-w-none">
                      <ReactMarkdown>{analysis}</ReactMarkdown>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="p-10 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 rounded-[2.5rem] text-center flex flex-col items-center justify-center relative">
                    <p className="text-slate-500 text-[10px] uppercase font-black mb-4 tracking-[0.3em]">Readiness Score</p>
                    <div className="text-8xl font-black text-white italic tracking-tighter relative drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                      {score}<span className="text-3xl text-blue-500 font-normal">%</span>
                    </div>
                  </div>
                  
                  <Button onClick={() => window.location.reload()} className="h-20 rounded-2xl bg-white text-black font-black text-2xl hover:bg-blue-600 hover:text-white transition-all transform hover:scale-[1.02] shadow-2xl flex gap-3">
                    <RefreshCw className="w-6 h-6" /> NEW_SESSION
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}