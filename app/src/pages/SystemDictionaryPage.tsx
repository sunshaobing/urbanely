import { ArrowLeft, Database } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SystemDictionaryEditor } from "../components/SystemDictionaryEditor";

export function SystemDictionaryPage({
  canEdit,
  onBack,
  onNotify,
}: {
  canEdit: boolean;
  onBack: () => void;
  onNotify: (message: string) => void;
}) {
  return (
    <div className="page">
      <PageHeader
        eyebrow="SYSTEM DICTIONARY"
        title="系统字典"
        description="统一维护业务分类、稳定编码、显示名称、排序和启停状态。"
        meta={
          <>
            <Database size={14} />
            {canEdit ? "管理员可编辑" : "当前账号只读"}
          </>
        }
        actions={
          <button type="button" className="button ghost" onClick={onBack}>
            <ArrowLeft size={15} />
            返回系统设置
          </button>
        }
      />
      <SystemDictionaryEditor
        open
        embedded
        canEdit={canEdit}
        onClose={() => undefined}
        onSaved={() => onNotify("系统字典已更新")}
      />
    </div>
  );
}
