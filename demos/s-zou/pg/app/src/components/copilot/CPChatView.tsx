import { useState } from "react";
import { Paperclip, Smile, Send, Sparkles, Clock, ThumbsUp, ThumbsDown, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CPChatViewProps {
  userName?: string;
  suggestedQuestion?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: any;
}

export function CPChatView({
  userName = "User",
  suggestedQuestion = "Show me what Process Copilot can do",
}: CPChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    // Add user message
    setMessages([...messages, { role: 'user', content: inputValue }]);

    // Simulate AI response
    setTimeout(() => {
      if (inputValue.toLowerCase().includes("vendor")) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: {
            type: 'response',
            text: 'Show me the results in a table.',
            reasoning: 'Reasoning',
            followUpQuestions: [
              'Show DPO trends over time',
              'Analyze payment terms impact on DPO',
              'Identify top vendors by invoice value'
            ],
            table: {
              headers: ['Vendor Name', 'Total Invoice Value'],
              rows: [
                ['Evergreen Logistics', '5.11M'],
                ['Global Tech Parts', '4.94M'],
                ['Nexus Components', '5.14M'],
                ['Quantum Supplies', '5.43M'],
                ['Rapid Supplies', '37.5K'],
                ['Stellar Manufacturing', '4.22M']
              ]
            }
          }
        }]);
      } else if (inputValue.toLowerCase().includes("dpo")) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: {
            type: 'kpi',
            text: 'Average Days Payable Outstanding (DPO) across all vendors.',
            reasoning: 'Reasoning',
            kpiValue: '49.4',
            followUpQuestions: [
              'Show DPO trends over time',
              'Analyze payment terms impact on DPO',
              'Identify top vendors by invoice value'
            ]
          }
        }]);
      } else {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: {
            type: 'text',
            text: 'I can help you analyze your process data. Try asking about vendors, DPO metrics, or payment terms.'
          }
        }]);
      }
    }, 500);

    setInputValue("");
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
  };

  return (
    <div className="flex-1 flex flex-col px-8 relative">
      {/* Chat messages area */}
      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto py-8 space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' ? (
                <div className="max-w-3xl w-full">
                  {msg.content.type === 'response' && (
                    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center flex-shrink-0 text-xs font-semibold">⊙</div>
                        <p className="text-sm text-foreground">{msg.content.text}</p>
                      </div>
                      {msg.content.table && (
                        <div className="border border-border rounded overflow-hidden">
                          <Table className="text-xs">
                            <TableHeader>
                              <TableRow className="bg-muted/30">
                                {msg.content.table.headers.map((h: string) => (
                                  <TableHead key={h} className="px-3 py-2 text-foreground font-semibold">{h}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {msg.content.table.rows.map((row: string[], ridx: number) => (
                                <TableRow key={ridx} className="border-t border-border">
                                  {row.map((cell: string, cidx: number) => (
                                    <TableCell key={cidx} className="px-3 py-2 text-foreground">{cell}</TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{msg.content.reasoning}</span>
                          <button className="text-muted-foreground hover:text-foreground">
                            <Maximize2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <ThumbsUp className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <ThumbsDown className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {msg.content.followUpQuestions && (
                        <div className="pt-2 space-y-2">
                          {msg.content.followUpQuestions.map((q: string, qidx: number) => (
                            <button 
                              key={qidx}
                              onClick={() => handleSuggestedQuestion(q)}
                              className="block w-full text-left text-xs px-3 py-1.5 rounded border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {msg.content.type === 'kpi' && (
                    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center flex-shrink-0 text-xs font-semibold">⊙</div>
                        <p className="text-sm text-foreground">{msg.content.text}</p>
                      </div>
                      <div className="text-4xl font-bold text-foreground">{msg.content.kpiValue}</div>
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{msg.content.reasoning}</span>
                          <button className="text-muted-foreground hover:text-foreground">
                            <Maximize2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <ThumbsUp className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <ThumbsDown className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {msg.content.followUpQuestions && (
                        <div className="pt-2 space-y-2">
                          {msg.content.followUpQuestions.map((q: string, qidx: number) => (
                            <button 
                              key={qidx}
                              onClick={() => handleSuggestedQuestion(q)}
                              className="block w-full text-left text-xs px-3 py-1.5 rounded border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {msg.content.type === 'text' && (
                    <div className="bg-card border border-border rounded-lg p-4">
                      <p className="text-sm text-foreground">{msg.content.text}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-3xl bg-muted/50 rounded-lg px-4 py-2">
                  <p className="text-sm text-foreground">{msg.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Greeting and input - shown when no messages */}
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Greeting */}
          <div className="text-center max-w-2xl mb-6">
            <h1 className="text-2xl font-bold text-foreground">Hi {userName},</h1>
          </div>

          {/* Chat Input */}
          <div className="w-full max-w-2xl">
            <div className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
              {/* Text input area */}
              <div className="px-4 pt-4 pb-2">
                <textarea
                  placeholder="What would you like to explore?"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="w-full bg-transparent border-none resize-none focus:outline-none text-sm min-h-[40px]"
                  rows={1}
                />
              </div>

              {/* Bottom toolbar */}
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-border hover:bg-muted">
                    <Smile className="w-4 h-4 text-primary" />
                  </Button>
                </div>
                <Button 
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-muted"
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                >
                  <Send className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              {/* Suggested question - inside the input box */}
              <button 
                onClick={() => handleSuggestedQuestion(suggestedQuestion)}
                className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors w-full border-t border-border"
              >
                <Sparkles className="w-4 h-4" />
                <span>{suggestedQuestion}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Input - shown when there are messages */}
      {messages.length > 0 && (
        <div className="w-full max-w-3xl mx-auto py-4">
          <div className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
            <div className="px-4 pt-4 pb-2">
              <textarea
                placeholder="What would you like to explore?"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="w-full bg-transparent border-none resize-none focus:outline-none text-sm min-h-[40px]"
                rows={1}
              />
            </div>
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-border hover:bg-muted">
                  <Smile className="w-4 h-4 text-primary" />
                </Button>
              </div>
              <Button 
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted"
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
              >
                <Send className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Latest conversation link - fixed at bottom when no messages */}
      {messages.length === 0 && (
        <button className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Clock className="w-4 h-4" />
          <span>Latest conversation</span>
        </button>
      )}

      {/* Disclaimer - at bottom */}
      {messages.length === 0 && (
        <p className="text-xs text-muted-foreground pb-4 text-center">
          Output is generated by AI, please verify as errors may occur.
        </p>
      )}
    </div>
  );
}