import { useState, useRef, useEffect } from 'react';
import { Input, Button, Avatar, Typography, Alert, Tag, Spin } from 'antd';
import {
  RobotOutlined,
  UserOutlined,
  SendOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';

const { Text, Title } = Typography;
const { TextArea } = Input;

export default function AiChat() {
  const translate = useLanguage();
  const currentAdmin = useSelector(selectCurrentAdmin);
  const isOwner = currentAdmin?.role === 'owner';

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I\'m your IDURAR AI assistant. I can help you with questions about invoices, quotes, payments, and customer management. How can I help you today?',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const messagesEndRef = useRef(null);

  // Owner: fetch AI config status
  useEffect(() => {
    if (isOwner) {
      request
        .get({ entity: 'ai-chat/status' })
        .then((res) => {
          if (res?.success) setAiStatus(res.result);
        })
        .catch(() => {});
    }
  }, [isOwner]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    const userMessage = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      // Send last 10 turns as history (exclude the new user message itself)
      const history = messages.slice(-10);
      const res = await request.post({
        entity: 'ai-chat/message',
        jsonData: { message: trimmed, history },
      });

      if (res?.success) {
        setMessages([...newMessages, { role: 'assistant', content: res.result.message }]);
      } else {
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content: res?.message || 'Sorry, something went wrong. Please try again.',
          },
        ]);
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Network error. Please check your connection and try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 16px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar
            size={48}
            icon={<RobotOutlined />}
            style={{ backgroundColor: '#6366f1' }}
          />
          <div>
            <Title level={4} style={{ margin: 0 }}>
              AI Assistant
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Powered by GPT · Always here to help
            </Text>
          </div>
        </div>

        {/* Owner-only: AI status badge */}
        {isOwner && aiStatus !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SettingOutlined style={{ color: '#8c8c8c' }} />
            <Tag color={aiStatus.isConfigured ? 'green' : 'orange'}>
              {aiStatus.isConfigured ? 'AI Connected' : 'API Key Not Set'}
            </Tag>
            {aiStatus.isConfigured && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {aiStatus.model} · {aiStatus.keyPreview}
              </Text>
            )}
          </div>
        )}
      </div>

      {/* Owner: show setup hint if not configured */}
      {isOwner && aiStatus && !aiStatus.isConfigured && (
        <Alert
          type="warning"
          showIcon
          message="AI Not Configured"
          description={
            <span>
              Set <Text code>OPENAI_API_KEY</Text> in your backend <Text code>.env</Text> file and
              restart the server to enable AI responses.
            </span>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Chat window */}
      <div
        className="whiteBox shadow"
        style={{
          height: 460,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          borderRadius: 8,
        }}
      >
        {messages.map((msg, index) => (
          <MessageBubble key={index} message={msg} currentAdmin={currentAdmin} />
        ))}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar
              size={32}
              icon={<RobotOutlined />}
              style={{ backgroundColor: '#6366f1', flexShrink: 0 }}
            />
            <div
              style={{
                background: '#f5f5f5',
                borderRadius: '0 12px 12px 12px',
                padding: '10px 14px',
              }}
            >
              <Spin size="small" />
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
                Thinking...
              </Text>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          marginTop: 16,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-end',
        }}
      >
        <TextArea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything about your invoices, payments, or customers… (Enter to send)"
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{ flex: 1, borderRadius: 8 }}
          disabled={isLoading}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={sendMessage}
          loading={isLoading}
          disabled={!inputValue.trim()}
          style={{ height: 40, borderRadius: 8, backgroundColor: '#6366f1', borderColor: '#6366f1' }}
        >
          Send
        </Button>
      </div>
      <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
        Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
      </Text>
    </div>
  );
}

function MessageBubble({ message, currentAdmin }) {
  const isUser = message.role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      {/* Avatar */}
      {isUser ? (
        <Avatar
          size={32}
          icon={<UserOutlined />}
          style={{ backgroundColor: '#1890ff', flexShrink: 0 }}
        />
      ) : (
        <Avatar
          size={32}
          icon={<RobotOutlined />}
          style={{ backgroundColor: '#6366f1', flexShrink: 0 }}
        />
      )}

      {/* Bubble */}
      <div
        style={{
          maxWidth: '75%',
          background: isUser ? '#1890ff' : '#f5f5f5',
          color: isUser ? '#fff' : 'rgba(0,0,0,0.85)',
          borderRadius: isUser ? '12px 0 12px 12px' : '0 12px 12px 12px',
          padding: '10px 14px',
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {message.content}
      </div>
    </div>
  );
}
