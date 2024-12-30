import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Package, Paperclip, SendHorizontal, Bot, User } from 'lucide-react'

interface Message {
  role: 'assistant' | 'user'
  content: string
  attachments?: string[]
}

export function Chat() {
  const [messages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hey there! I can help analyze your files or bundles. What would you like to know?'
    },
    {
      role: 'user',
      content: 'Can you analyze this bundle?',
      attachments: ['Big Chungus (4 files)']
    },
    {
      role: 'assistant',
      content: 'Looking at the Big Chungus bundle, I can see it contains the core database files. The bundle is currently fresh, last updated at 12:05:26 AM.'
    }
  ])

  return (
    <div className="flex flex-col h-screen p-4">
      <div className="flex items-center gap-2 pb-4 border-b">
        <Select defaultValue="claude">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Assistant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="claude">Claude</SelectItem>
            <SelectItem value="gpt4">GPT-4</SelectItem>
            <SelectItem value="gemini">Gemini</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-grow" />
        <Button variant="outline" size="sm">
          Clear Chat
        </Button>
      </div>

      <ScrollArea className="flex-grow my-4">
        <div className="space-y-4">
          {messages.map((message, i) => (
            <div
              key={i}
              className={`flex gap-2 ${message.role === 'assistant' ? 'pr-12' : 'pl-12'}`}
            >
              <div className={`flex flex-col ${message.role === 'user' ? 'items-end ml-auto' : ''}`}>
                <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
                  {message.role === 'assistant' ? (
                    <>
                      <Bot className="w-4 h-4" />
                      <span>Assistant</span>
                    </>
                  ) : (
                    <>
                      <span>You</span>
                      <User className="w-4 h-4" />
                    </>
                  )}
                </div>
                <div
                  className={`rounded-lg p-3 max-w-[85%] ${message.role === 'assistant'
                    ? 'bg-muted'
                    : 'bg-primary text-primary-foreground'
                    }`}
                >
                  <p className="text-sm">{message.content}</p>
                  {message.attachments && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.attachments.map((att, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1 bg-background/10 rounded px-2 py-1 text-xs"
                        >
                          <Package className="w-3 h-3" />
                          {att}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="pt-4 border-t">
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Package className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Ask about your files and bundles..."
            className="flex-grow"
          />
          <Button size="icon">
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Chat
