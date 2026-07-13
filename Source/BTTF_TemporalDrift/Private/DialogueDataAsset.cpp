#include "DialogueDataAsset.h"

const FDialogueNode* UDialogueDataAsset::FindNode(FName NodeId) const
{
    return Nodes.FindByPredicate([NodeId](const FDialogueNode& Node) { return Node.NodeId == NodeId; });
}
