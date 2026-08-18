using System.Collections.Generic;

namespace TemporalDrift
{
    public sealed class DialogueSystem
    {
        readonly Dictionary<string, ConversationData> _conversations = new Dictionary<string, ConversationData>();
        ConversationData _active;
        DialogueNodeData _current;

        public DialogueNodeData Current => _current;
        public bool IsOpen => _current != null;

        public DialogueSystem(DialogueCatalogData data)
        {
            if (data?.conversations == null) return;
            foreach (var conversation in data.conversations)
            {
                _conversations[conversation.id] = conversation;
            }
        }

        public bool StartConversation(string conversationId)
        {
            if (!_conversations.TryGetValue(conversationId, out _active))
            {
                _current = null;
                return false;
            }

            _current = Find(_active.entryNodeId);
            return _current != null;
        }

        public string Advance()
        {
            if (_current == null || _active == null) return null;
            var missionEvent = _current.missionEvent;
            if (!string.IsNullOrEmpty(_current.automaticNextNodeId))
            {
                _current = Find(_current.automaticNextNodeId);
            }
            else
            {
                _current = null;
                _active = null;
            }

            return string.IsNullOrEmpty(missionEvent) ? null : missionEvent;
        }

        DialogueNodeData Find(string nodeId)
        {
            if (_active?.nodes == null) return null;
            foreach (var node in _active.nodes)
            {
                if (node.id == nodeId) return node;
            }

            return null;
        }
    }
}
