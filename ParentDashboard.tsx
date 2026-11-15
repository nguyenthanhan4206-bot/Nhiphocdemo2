import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Check,
  CheckCheck,
  Eye,
  HelpCircle,
  Lightbulb,
  Link2,
  LogOut,
  Menu,
  MessageSquare,
  Send,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  Assignment,
  FeedbackTicket,
  FocusSession,
  Message,
  PublicUser,
  Schedule,
  StudentProfile,
  TicketCategory,
} from '../types';
import {
  createFeedbackTicket,
  createSchedule,
  getTreeStageLabel,
  linkStudentByCode,
  sendMessage,
} from '../services/nhiphocService';
import { formatTimeAgoVi } from '../utils/imageCompress';
import { DeleteAccountModal } from './DeleteAccountModal';
import {
  MascotAvatar,
  NhiphocAnimatedLogo,
  NhiphocLogoMark,
  NhiphocRhythmMark,
} from './MascotAvatar';

interface ParentDashboardProps {
  user: PublicUser;
  students: StudentProfile[];
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
  assignments: Assignment[];
  focusSessions: FocusSession[];
  messages: Message[];
  schedules: Schedule[];
  tickets: FeedbackTicket[];
  onSignOut: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

type ParentTab = 'contact_schedule' | 'child_progress' | 'feedback_help';

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
  user,
  students,
  selectedStudentId,
  onSelectStudent,
  assignments,
  focusSessions,
  messages,
  schedules,
  tickets,
  onSignOut,
  onDeleteAccount,
}) => {
  const [activeTab, setActiveTab] = useState<ParentTab>('child_progress');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Link child modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkCodeInput, setLinkCodeInput] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Chat state
  const [msgText, setMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Schedule state
  const [schTitle, setSchTitle] = useState('Trao đổi tiến độ tuần');
  const [schDate, setSchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [schTime, setSchTime] = useState('19:30');
  const [schNote, setSchNote] = useState('');
  const [creatingSch, setCreatingSch] = useState(false);

  // Feedback / Help state
  const [ticketCategory, setTicketCategory] = useState<TicketCategory>('feedback');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [sendingTicket, setSendingTicket] = useState(false);
  const [ticketNotice, setTicketNotice] = useState<string | null>(null);

  // Photo preview
  const [previewPhoto, setPreviewPhoto] = useState<{ title: string; url: string } | null>(null);

  const student = students.find((s) => s.id === selectedStudentId) || students[0] || null;

  const studentAssignments = useMemo(
    () => (student ? assignments.filter((a) => a.studentId === student.id) : []),
    [assignments, student],
  );

  const studentMessages = useMemo(
    () => (student ? messages.filter((m) => m.studentId === student.id) : []),
    [messages, student],
  );

  const studentSchedules = useMemo(
    () => (student ? schedules.filter((s) => s.studentId === student.id) : []),
    [schedules, student],
  );

  const studentTickets = useMemo(
    () => (student ? tickets.filter((t) => t.studentId === student.id) : []),
    [tickets, student],
  );

  const studentFocusSessions = useMemo(
    () => (student ? focusSessions.filter((f) => f.studentId === student.id) : []),
    [focusSessions, student],
  );

  const progressStats = useMemo(() => {
    const total = studentAssignments.length;
    const submitted = studentAssignments.filter((a) => a.status !== 'pending').length;
    const graded = studentAssignments.filter((a) => a.status === 'graded').length;
    const completionPct = total > 0 ? Math.round((submitted / total) * 100) : 0;
    return { total, submitted, graded, completionPct };
  }, [studentAssignments]);

  const weeklyFocusMinutes = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    studentFocusSessions.forEach((s) => {
      const ms = s.createdAt?.toMillis?.();
      if (!ms) return;
      const day = new Date(ms).getDay();
      const idx = day === 0 ? 6 : day - 1;
      totals[idx] += s.durationMinutes || 0;
    });
    const maxMins = Math.max(30, ...totals);
    return totals.map((mins, i) => ({
      label: WEEKDAY_LABELS[i],
      mins,
      heightPct: Math.max(10, Math.round((mins / maxMins) * 100)),
    }));
  }, [studentFocusSessions]);

  const latestHighlightAssignment = useMemo(() => {
    return (
      studentAssignments.find((a) => a.status === 'graded') ||
      studentAssignments.find((a) => a.status === 'submitted') ||
      studentAssignments[0] ||
      null
    );
  }, [studentAssignments]);

  const nextPendingAssignment = useMemo(
    () => studentAssignments.find((a) => a.status === 'pending') || null,
    [studentAssignments],
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !msgText.trim()) return;
    setSendingMsg(true);
    try {
      await sendMessage({
        student,
        senderUid: user.uid,
        senderName: user.displayName,
        senderRole: 'parent',
        content: msgText,
      });
      setMsgText('');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !schTitle.trim()) return;
    setCreatingSch(true);
    try {
      await createSchedule({
        student,
        createdBy: user.uid,
        title: schTitle,
        dateStr: schDate,
        timeStr: schTime,
        note: schNote,
      });
      setSchNote('');
    } finally {
      setCreatingSch(false);
    }
  };

  const handleSendTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !ticketSubject.trim() || !ticketMessage.trim()) return;
    setSendingTicket(true);
    setTicketNotice(null);
    try {
      await createFeedbackTicket({
        student,
        createdBy: user.uid,
        category: ticketCategory,
        subject: ticketSubject,
        message: ticketMessage,
      });
      setTicketSubject('');
      setTicketMessage('');
      setTicketNotice('Đã gửi phản hồi tới trợ lý. Bạn sẽ nhận được hồi âm ngay tại mục này.');
    } finally {
      setSendingTicket(false);
    }
  };

  const handleLinkChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);
    setLinking(true);
    try {
      const id = await linkStudentByCode(linkCodeInput, user.uid, 'parent');
      onSelectStudent(id);
      setLinkCodeInput('');
      setShowLinkModal(false);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Không thể kết nối mã học sinh.');
    } finally {
      setLinking(false);
    }
  };

  const navItems: Array<{
    id: ParentTab;
    label: string;
    shortLabel: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { id: 'contact_schedule', label: 'Liên lạc & Lên lịch', shortLabel: 'Liên lạc & Lịch', icon: MessageSquare },
    { id: 'child_progress', label: 'Kiểm tra tiến độ của con', shortLabel: 'Tiến độ của con', icon: BarChart3 },
    { id: 'feedback_help', label: 'Phản hồi & Trợ giúp', shortLabel: 'Phản hồi & Trợ giúp', icon: HelpCircle },
  ];

  const renderSidebar = () => (
    <div className="flex flex-col h-full justify-between p-5">
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[#3A3227]">
          <NhiphocLogoMark className="w-10 h-10 shrink-0" />
          <div className="min-w-0">
            <p className="text-lg font-extrabold tracking-tight text-[#F7F2E7] leading-tight">
              Nhịp<span className="text-[#E6B87D]">Học</span>
            </p>
            <p className="text-xs text-[#C8BCAA] truncate">Phụ huynh · Giao diện tối</p>
          </div>
        </div>

        {/* Child Switcher */}
        {students.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#C8BCAA]">
              <span>Học sinh đang theo dõi</span>
              <button
                type="button"
                onClick={() => setShowLinkModal(true)}
                className="text-[#E6B87D] hover:underline font-semibold inline-flex items-center gap-1"
              >
                <Link2 className="w-3 h-3" />
                Kết nối thêm
              </button>
            </div>
            <select
              value={student?.id || ''}
              onChange={(e) => onSelectStudent(e.target.value)}
              className="w-full rounded-xl bg-[#221D17] border border-[#3A3227] px-3 py-2 text-xs font-semibold text-[#F7F2E7] focus:outline-none focus:border-[#C45A15]"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.studentName} ({s.grade})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 3 Nav Items */}
        <nav className="space-y-1.5" aria-label="Menu phụ huynh">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#C45A15] text-white'
                    : 'text-[#D8CFC1] hover:bg-[#2B241D] hover:text-[#F7F2E7]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {student && (
          <div className="rounded-xl border border-[#3A3227] bg-[#221D17] p-3.5 space-y-1.5 text-xs">
            <p className="text-[#C8BCAA]">Mã hồ sơ của con</p>
            <p className="font-mono font-bold text-[#E6B87D] tracking-wider">
              {student.linkCode}
            </p>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-[#3A3227] space-y-3">
        <div className="text-xs text-[#C8BCAA]">
          <p className="font-semibold text-[#F7F2E7] truncate">{user.displayName}</p>
          <p className="truncate">Bàn học tối dịu mắt</p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-[#3A3227] text-xs font-semibold text-[#DCD1BF] hover:bg-[#2B241D] transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Đăng xuất
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#A49785] hover:text-red-300 hover:bg-red-950/40 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Xóa tài khoản
        </button>
      </div>
    </div>
  );

  const ringRadius = 36;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (progressStats.completionPct / 100) * ringCircumference;

  return (
    <div className="min-h-screen bg-[#181511] text-[#F7F2E7] flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0 bg-[#201C17] border-r border-[#3A3227] sticky top-0 h-screen">
        {renderSidebar()}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-[#201C17] h-full border-r border-[#3A3227] z-10">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-[#C8BCAA] hover:bg-[#2B241D]"
            >
              <X className="w-5 h-5" />
            </button>
            {renderSidebar()}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-[#181511]/90 backdrop-blur-sm border-b border-[#3A3227] sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-lg text-[#F7F2E7] hover:bg-[#2B241D] shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs text-[#C8BCAA] truncate">
                  {student ? `${student.studentName} · ${student.grade}` : 'Phụ huynh'}
                </p>
                <h1 className="text-base sm:text-lg font-bold tracking-wide text-[#F7F2E7] leading-tight whitespace-nowrap">
                  {navItems.find((n) => n.id === activeTab)?.shortLabel}
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowLinkModal(true)}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-lg border border-[#3A3227] bg-[#221D17] text-xs font-semibold text-[#E6B87D] hover:bg-[#2B241D] transition-colors whitespace-nowrap shrink-0"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nhập mã kết nối con</span>
              <span className="sm:hidden">Nhập mã</span>
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto px-5 sm:px-8 py-7 space-y-6">
          {student && (
            <section className="rounded-2xl border border-[#3A3227] bg-[#221D17] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <NhiphocAnimatedLogo size="sm" dark />
                  <MascotAvatar size="lg" mood="happy" dark />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <NhiphocRhythmMark dark />
                    <span className="text-xs font-semibold text-[#E6B87D]">
                      Nhịp Nhỏ đồng hành cùng {student.studentName}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-[#F7F2E7]">
                    {progressStats.submitted}/{progressStats.total} bài đã nộp ·{' '}
                    {student.focusMinutesTotal} phút tập trung
                  </h2>
                </div>
              </div>
              <div className="text-xs text-[#C8BCAA] shrink-0">
                {student.assistantOnline ? 'Trợ lý đang trực tuyến' : 'Trợ lý sẽ phản hồi theo lịch'}
              </div>
            </section>
          )}

          {!student ? (
            <div className="rounded-2xl border border-[#3A3227] bg-[#221D17] p-10 text-center space-y-4">
              <p className="text-base font-semibold text-[#F7F2E7]">
                Bạn chưa kết nối với hồ sơ học sinh nào
              </p>
              <p className="text-sm text-[#C8BCAA] max-w-md mx-auto">
                Hãy nhập Mã kết nối (NH...) từ tài khoản của con hoặc của trợ lý để xem toàn bộ
                tiến độ học tập.
              </p>
              <button
                type="button"
                onClick={() => setShowLinkModal(true)}
                className="px-5 py-2.5 rounded-xl bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F]"
              >
                Kết nối ngay
              </button>
            </div>
          ) : activeTab === 'contact_schedule' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Direct Message Thread */}
              <section className="lg:col-span-7 rounded-2xl border border-[#3A3227] bg-[#221D17] flex flex-col h-[540px]">
                <div className="px-5 py-4 border-b border-[#3A3227] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-[#F7F2E7]">
                      Trao đổi trực tiếp với Trợ lý
                    </h2>
                    <p className="text-xs text-[#C8BCAA]">
                      {student.assistantOnline
                        ? 'Trợ lý đang trực tuyến'
                        : 'Trợ lý sẽ phản hồi khi trực tuyến'}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {studentMessages.length === 0 ? (
                    <p className="text-sm text-[#C8BCAA] text-center py-12">
                      Chưa có tin nhắn nào. Phụ huynh có thể nhắn hỏi tình hình học tập của con tại
                      đây.
                    </p>
                  ) : (
                    studentMessages.map((m) => {
                      const isMe = m.senderUid === user.uid;
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <span className="text-xs text-[#A49785] mb-1">
                            {m.senderName} ·{' '}
                            {m.senderRole === 'assistant'
                              ? 'Trợ lý'
                              : m.senderRole === 'parent'
                                ? 'Phụ huynh'
                                : 'Học sinh'}
                          </span>
                          <div
                            className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                              isMe
                                ? 'bg-[#C45A15] text-white'
                                : 'bg-[#2B241D] border border-[#3A3227] text-[#F7F2E7]'
                            }`}
                          >
                            {m.content}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t border-[#3A3227] flex items-center gap-2.5"
                >
                  <input
                    type="text"
                    maxLength={1000}
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    placeholder="Nhắn tin cho trợ lý..."
                    className="flex-1 rounded-xl bg-[#181511] border border-[#3A3227] px-4 py-2.5 text-sm text-[#F7F2E7] placeholder:text-[#8E8272] focus:outline-none focus:border-[#C45A15]"
                  />
                  <button
                    type="submit"
                    disabled={sendingMsg || !msgText.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F] disabled:opacity-45 transition-colors whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Gửi
                  </button>
                </form>
              </section>

              {/* Right: Schedule Session */}
              <section className="lg:col-span-5 space-y-5">
                <form
                  onSubmit={handleCreateSchedule}
                  className="rounded-2xl border border-[#3A3227] bg-[#221D17] p-5 space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-[#F7F2E7]">
                    <Calendar className="w-4 h-4 text-[#E6B87D]" />
                    <span>Đặt lịch trao đổi / kèm học</span>
                  </div>

                  <div>
                    <label className="block text-xs text-[#C8BCAA] mb-1">Nội dung buổi hẹn</label>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={schTitle}
                      onChange={(e) => setSchTitle(e.target.value)}
                      className="w-full rounded-xl bg-[#181511] border border-[#3A3227] px-3.5 py-2 text-sm text-[#F7F2E7] focus:outline-none focus:border-[#C45A15]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#C8BCAA] mb-1">Ngày</label>
                      <input
                        type="date"
                        required
                        value={schDate}
                        onChange={(e) => setSchDate(e.target.value)}
                        className="w-full rounded-xl bg-[#181511] border border-[#3A3227] px-3 py-2 text-sm text-[#F7F2E7] tabular-nums focus:outline-none focus:border-[#C45A15]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#C8BCAA] mb-1">Giờ</label>
                      <input
                        type="time"
                        required
                        value={schTime}
                        onChange={(e) => setSchTime(e.target.value)}
                        className="w-full rounded-xl bg-[#181511] border border-[#3A3227] px-3 py-2 text-sm text-[#F7F2E7] tabular-nums focus:outline-none focus:border-[#C45A15]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#C8BCAA] mb-1">Ghi chú thêm</label>
                    <textarea
                      rows={2}
                      maxLength={400}
                      value={schNote}
                      onChange={(e) => setSchNote(e.target.value)}
                      placeholder="Ví dụ: Nhờ trợ lý đánh giá kỹ phần Toán hình của con..."
                      className="w-full rounded-xl bg-[#181511] border border-[#3A3227] px-3.5 py-2 text-sm text-[#F7F2E7] placeholder:text-[#8E8272] focus:outline-none focus:border-[#C45A15]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={creatingSch}
                    className="w-full py-2.5 rounded-xl bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F] disabled:opacity-50 transition-colors"
                  >
                    {creatingSch ? 'Đang gửi lịch...' : 'Gửi đề xuất lịch hẹn'}
                  </button>
                </form>

                <div className="rounded-2xl border border-[#3A3227] bg-[#221D17] p-5 space-y-3">
                  <h3 className="text-sm font-bold text-[#F7F2E7]">Lịch đã đặt</h3>
                  {studentSchedules.length === 0 ? (
                    <p className="text-xs text-[#C8BCAA]">Chưa có lịch hẹn nào.</p>
                  ) : (
                    <div className="divide-y divide-[#3A3227]">
                      {studentSchedules.map((sch) => (
                        <div key={sch.id} className="py-3 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[#F7F2E7] truncate">
                              {sch.title}
                            </p>
                            <span className="text-xs font-semibold text-[#E6B87D] shrink-0">
                              {sch.status === 'confirmed'
                                ? 'Đã xác nhận'
                                : sch.status === 'completed'
                                  ? 'Đã hoàn thành'
                                  : sch.status === 'cancelled'
                                    ? 'Đã hủy'
                                    : 'Chờ xác nhận'}
                            </span>
                          </div>
                          <p className="text-xs text-[#C8BCAA] tabular-nums">
                            {sch.dateStr} · {sch.timeStr}
                          </p>
                          {sch.note && <p className="text-xs text-[#A49785]">{sch.note}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : activeTab === 'child_progress' ? (
            <div className="space-y-6">
              {/* Top 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl border border-[#3A3227] bg-[#221D17]">
                  <p className="text-xs text-[#C8BCAA]">Bài tập đã nộp</p>
                  <p className="text-2xl font-extrabold text-[#F7F2E7] mt-1 tabular-nums">
                    {progressStats.submitted}/{progressStats.total}
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-[#3A3227] bg-[#221D17]">
                  <p className="text-xs text-[#C8BCAA]">Đã chấm xong</p>
                  <p className="text-2xl font-extrabold text-[#E6B87D] mt-1 tabular-nums">
                    {progressStats.graded}/{progressStats.total}
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-[#3A3227] bg-[#221D17]">
                  <p className="text-xs text-[#C8BCAA]">Cây tập trung</p>
                  <p className="text-2xl font-extrabold text-[#F7F2E7] mt-1 tabular-nums">
                    {student.focusMinutesTotal} phút
                  </p>
                  <p className="text-xs text-[#C8BCAA] mt-0.5">
                    {getTreeStageLabel(student.focusMinutesTotal).label}
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-[#3A3227] bg-[#221D17]">
                  <p className="text-xs text-[#C8BCAA]">Phiên tập trung</p>
                  <p className="text-2xl font-extrabold text-[#F7F2E7] mt-1 tabular-nums">
                    {studentFocusSessions.length} phiên
                  </p>
                </div>
              </div>

              {/* Overview Row: Completion Ring + Weekly Focus Bars + Daily Summary & Companion Tip */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-6 rounded-2xl border border-[#3A3227] bg-[#221D17] p-6 flex flex-col justify-between gap-5">
                  <div>
                    <p className="text-xs font-semibold text-[#E6B87D]">Tổng quan hoàn thành</p>
                    <h2 className="text-base font-bold text-[#F7F2E7] mt-0.5">
                      Tiến độ bài tập & phút tập trung trong tuần
                    </h2>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
                          <circle
                            cx="44"
                            cy="44"
                            r={ringRadius}
                            fill="none"
                            stroke="#3A3227"
                            strokeWidth="8"
                          />
                          <circle
                            cx="44"
                            cy="44"
                            r={ringRadius}
                            fill="none"
                            stroke="#C45A15"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={ringCircumference}
                            strokeDashoffset={ringOffset}
                          />
                        </svg>
                        <span className="absolute text-lg font-extrabold text-[#F7F2E7] tabular-nums">
                          {progressStats.completionPct}%
                        </span>
                      </div>
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-[#F7F2E7]">Mức độ hoàn thành</p>
                        <p className="text-[#C8BCAA] tabular-nums">
                          {progressStats.submitted} trên {progressStats.total} bài tập
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 flex items-end justify-between gap-2 h-24 pt-2 border-b border-[#3A3227] pb-1">
                      {weeklyFocusMinutes.map((d) => (
                        <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                          <div className="w-full max-w-[20px] flex-1 flex items-end">
                            <div
                              className={`w-full rounded-t-md transition-all ${
                                d.mins > 0 ? 'bg-[#C45A15]' : 'bg-[#3A3227]'
                              }`}
                              style={{ height: `${d.heightPct}%` }}
                              title={`${d.label}: ${d.mins} phút`}
                            />
                          </div>
                          <span className="text-xs text-[#C8BCAA] font-medium">{d.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bản tin cuối ngày & Gợi ý đồng hành */}
                <div className="lg:col-span-6 rounded-2xl border border-[#3A3227] bg-[#221D17] p-6 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Star className="w-5 h-5 text-[#C45A15] shrink-0 mt-0.5 animate-star-twinkle" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-[#E6B87D]">Bản tin cuối ngày</p>
                        <p className="text-sm text-[#F7F2E7] leading-relaxed">
                          {latestHighlightAssignment
                            ? latestHighlightAssignment.status === 'graded'
                              ? `${student.studentName} đã hoàn thành "${latestHighlightAssignment.title}" (${latestHighlightAssignment.scoreLabel || 'Đã chấm'}) — ${latestHighlightAssignment.assistantFeedback}`
                              : latestHighlightAssignment.status === 'submitted'
                                ? `${student.studentName} đã nộp ảnh bài "${latestHighlightAssignment.title}" và đang chờ trợ lý chấm chi tiết.`
                                : `${student.studentName} hiện có ${progressStats.total - progressStats.submitted} bài tập đang chờ hoàn thành.`
                            : `Chưa có bài tập nào được giao cho ${student.studentName}.`}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#3A3227] flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-[#E6B87D] shrink-0 mt-0.5 animate-glow-pulse" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-[#E6B87D]">Gợi ý đồng hành</p>
                        <p className="text-xs text-[#C8BCAA] leading-relaxed">
                          {nextPendingAssignment
                            ? `Tối nay cha mẹ có thể hỏi thăm con về bài "${nextPendingAssignment.title}" (${nextPendingAssignment.subject}) hoặc nhắc con bật Cây tập trung 25 phút nhé.`
                            : `Con đã hoàn thành hết các bài đã giao! Cha mẹ có thể khen ngợi chuỗi ${student.streakDays} ngày học đều của con hoặc nhắn trao đổi thêm với trợ lý.`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveTab('contact_schedule')}
                      className="text-xs font-bold text-[#E6B87D] hover:underline"
                    >
                      Nhắn tin hoặc đặt lịch cùng Trợ lý →
                    </button>
                  </div>
                </div>
              </div>

              {/* Clean Assignment Progress Table/List */}
              <div className="rounded-2xl border border-[#3A3227] bg-[#221D17] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#3A3227] flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#F7F2E7]">
                    Chi tiết bài tập của {student.studentName}
                  </h2>
                  <span className="text-xs text-[#C8BCAA] tabular-nums">
                    {studentAssignments.length} bài tập
                  </span>
                </div>

                {studentAssignments.length === 0 ? (
                  <p className="p-6 text-sm text-[#C8BCAA]">Chưa có bài tập nào được giao.</p>
                ) : (
                  <div className="divide-y divide-[#3A3227]">
                    {studentAssignments.map((a) => (
                      <div
                        key={a.id}
                        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#C8BCAA]">
                            <span className="text-[#E6B87D] font-semibold">{a.subject}</span>
                            <span aria-hidden="true">·</span>
                            <span>{a.type === 'today' ? 'Bài hôm nay' : 'Bài bổ sung'}</span>
                            <span aria-hidden="true">·</span>
                            <span>{a.dueLabel}</span>
                          </div>
                          <p className="text-sm font-bold text-[#F7F2E7]">{a.title}</p>
                          {a.assistantFeedback && (
                            <p className="text-xs text-[#DCD1BF] pt-1">
                              Nhận xét trợ lý ({a.scoreLabel || 'Đã chấm'}): {a.assistantFeedback}
                            </p>
                          )}
                          {a.submittedAtMs > 0 && (
                            <p className="text-xs text-[#A49785]">
                              Nộp lúc: {formatTimeAgoVi(a.submittedAtMs)}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {a.photoDataUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewPhoto({ title: a.title, url: a.photoDataUrl })
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#3A3227] bg-[#181511] text-xs font-semibold text-[#F7F2E7] hover:bg-[#2B241D] whitespace-nowrap"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Xem ảnh bài
                            </button>
                          )}
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${
                              a.status === 'graded'
                                ? 'text-[#E6B87D]'
                                : a.status === 'submitted'
                                  ? 'text-[#C45A15]'
                                  : 'text-[#C8BCAA]'
                            }`}
                          >
                            {a.status === 'graded' ? (
                              <>
                                <CheckCheck className="w-4 h-4" />
                                Đã chấm xong
                              </>
                            ) : a.status === 'submitted' ? (
                              <>
                                <Check className="w-4 h-4" />
                                Đã nộp
                              </>
                            ) : (
                              'Chưa nộp'
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Section 3: Phản hồi & Trợ giúp */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleSendTicket}
                className="lg:col-span-5 rounded-2xl border border-[#3A3227] bg-[#221D17] p-6 space-y-4"
              >
                <h2 className="text-base font-bold text-[#F7F2E7]">
                  Gửi phản hồi hoặc yêu cầu trợ giúp
                </h2>

                <div>
                  <label className="block text-xs text-[#C8BCAA] mb-1.5">Phân loại</label>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#181511] border border-[#3A3227]">
                    <button
                      type="button"
                      onClick={() => setTicketCategory('feedback')}
                      className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                        ticketCategory === 'feedback'
                          ? 'bg-[#C45A15] text-white'
                          : 'text-[#C8BCAA] hover:text-[#F7F2E7]'
                      }`}
                    >
                      Phản hồi học tập
                    </button>
                    <button
                      type="button"
                      onClick={() => setTicketCategory('support')}
                      className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                        ticketCategory === 'support'
                          ? 'bg-[#C45A15] text-white'
                          : 'text-[#C8BCAA] hover:text-[#F7F2E7]'
                      }`}
                    >
                      Cần trợ giúp
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#C8BCAA] mb-1.5">Tiêu đề</label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Ví dụ: Điều chỉnh thời lượng bài tập buổi tối"
                    className="w-full rounded-xl bg-[#181511] border border-[#3A3227] px-3.5 py-2.5 text-sm text-[#F7F2E7] placeholder:text-[#8E8272] focus:outline-none focus:border-[#C45A15]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#C8BCAA] mb-1.5">Nội dung chi tiết</label>
                  <textarea
                    rows={4}
                    required
                    maxLength={1000}
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    placeholder="Chia sẻ mong muốn hoặc vấn đề gia đình đang gặp phải..."
                    className="w-full rounded-xl bg-[#181511] border border-[#3A3227] px-3.5 py-2.5 text-sm text-[#F7F2E7] placeholder:text-[#8E8272] focus:outline-none focus:border-[#C45A15]"
                  />
                </div>

                {ticketNotice && (
                  <p className="text-xs text-[#E6B87D] bg-[#2B241D] border border-[#3A3227] rounded-xl px-3.5 py-2.5">
                    {ticketNotice}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={sendingTicket}
                  className="w-full py-3 rounded-xl bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F] disabled:opacity-50 transition-colors"
                >
                  {sendingTicket ? 'Đang gửi...' : 'Gửi phản hồi / yêu cầu'}
                </button>
              </form>

              <div className="lg:col-span-7 rounded-2xl border border-[#3A3227] bg-[#221D17] p-6 space-y-4">
                <h2 className="text-base font-bold text-[#F7F2E7]">
                  Lịch sử phản hồi & hồi âm từ Trợ lý
                </h2>

                {studentTickets.length === 0 ? (
                  <p className="text-sm text-[#C8BCAA] py-6">
                    Chưa có yêu cầu phản hồi hay trợ giúp nào.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {studentTickets.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-xl border border-[#3A3227] bg-[#1A1612] p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-[#C8BCAA]">
                            {t.category === 'feedback'
                              ? 'Phản hồi'
                              : t.category === 'support'
                                ? 'Trợ giúp'
                                : 'Quản lý'}
                          </span>
                          <span className="font-semibold text-[#E6B87D]">
                            {t.status === 'replied'
                              ? 'Trợ lý đã phản hồi'
                              : t.status === 'closed'
                                ? 'Đã đóng'
                                : 'Đang chờ xử lý'}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-[#F7F2E7]">{t.subject}</p>
                        <p className="text-xs text-[#DCD1BF] leading-relaxed">{t.message}</p>
                        {t.reply && (
                          <div className="pt-2.5 border-t border-[#3A3227] text-xs text-[#E6B87D]">
                            <p className="font-semibold mb-1">Hồi âm từ Trợ lý:</p>
                            <p className="text-[#F7F2E7] leading-relaxed">{t.reply}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Photo Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="max-w-2xl w-full bg-[#221D17] rounded-2xl border border-[#3A3227] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-[#3A3227] flex items-center justify-between">
              <p className="text-sm font-bold text-[#F7F2E7] truncate">{previewPhoto.title}</p>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1.5 rounded-lg text-[#C8BCAA] hover:bg-[#2B241D]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-[#181511]">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.title}
                className="max-h-[70vh] mx-auto rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Link Child Modal */}
      {showLinkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#3A3227] bg-[#221D17] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#F7F2E7]">
                Kết nối hồ sơ con bằng mã NH
              </h3>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="p-1.5 rounded-lg text-[#C8BCAA] hover:bg-[#2B241D]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleLinkChild} className="space-y-4">
              <div>
                <label className="block text-xs text-[#C8BCAA] mb-1.5">
                  Nhập mã kết nối (ví dụ: NH842K19)
                </label>
                <input
                  type="text"
                  required
                  maxLength={12}
                  value={linkCodeInput}
                  onChange={(e) => setLinkCodeInput(e.target.value.toUpperCase())}
                  placeholder="NH..."
                  className="w-full rounded-xl bg-[#181511] border border-[#3A3227] px-3.5 py-2.5 text-sm font-mono uppercase text-[#F7F2E7] focus:outline-none focus:border-[#C45A15]"
                />
              </div>
              {linkError && (
                <p className="text-xs text-red-300 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">
                  {linkError}
                </p>
              )}
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[#C8BCAA] hover:bg-[#2B241D]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={linking}
                  className="px-4 py-2 rounded-lg bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F] disabled:opacity-50"
                >
                  {linking ? 'Đang kết nối...' : 'Kết nối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <DeleteAccountModal
          displayName={user.displayName}
          dark
          onClose={() => setShowDeleteModal(false)}
          onConfirmDelete={onDeleteAccount}
        />
      )}
    </div>
  );
};
