class GroupChatService {
  detectIntent(message) {
    const text = message.toLowerCase();
    if (text.includes('book')) return 'booking';
    if (text.includes('cancel')) return 'cancel';
    if (text.includes('reschedule')) return 'reschedule';
    return 'unknown';
  }

  routeToIndividual(msg, phone) {
    return { routed: true, msg, phone, route: 'private' };
  }

  linkToGroup(bookingId, groupId) {
    return { linked: true, bookingId, groupId };
  }

  static inst() {
    if (!this._inst) this._inst = new GroupChatService();
    return this._inst;
  }
}

module.exports = { GroupChatService, getGroupChatService: () => GroupChatService.inst() };
