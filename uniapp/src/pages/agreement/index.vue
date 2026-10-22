<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import PageHeader from "../../components/PageHeader.vue";

type AgreementType = "service" | "privacy";

interface Section {
  title: string;
  paragraphs: string[];
}

const type = ref<AgreementType>("service");

const effectiveDate = "2026年10月21日";

const serviceSections: Section[] = [
  {
    title: "一、服务说明",
    paragraphs: [
      "本系统由上海申汰实业有限公司提供给经授权的现场服务人员使用，用于接收作业任务、记录现场勘测与封堵过程、采集现场影像和手写签字、生成服务报告以及完成内部审批。",
      "账号仅限本人使用。系统分配的账号、密码和登录凭证不得转借、共享或交由他人代为操作。",
    ],
  },
  {
    title: "二、现场作业规范",
    paragraphs: [
      "使用人应按照项目安排到达服务现场，在签到、影像采集、勘测记录、封堵记录和签字确认等环节如实填写信息，不得虚构定位、照片、材料用量、服务时间或客户签字。",
      "现场作业应符合客户现场管理要求及公司安全规范。涉及登高、用电、药剂使用等作业时，应具备相应授权并采取必要的安全防护措施。",
    ],
  },
  {
    title: "三、数据与报告",
    paragraphs: [
      "作业过程中提交的定位、照片、签字、材料和时间记录将用于形成服务报告、内部审核、质量追溯和客户交付。报告生成后作为业务快照留存，修改记录依法依约保存。",
      "使用人应对其提交内容的真实性负责。发现记录错误时，应及时通过系统或项目管理员更正，不得擅自篡改已归档报告。",
    ],
  },
  {
    title: "四、账号与系统安全",
    paragraphs: [
      "使用人应妥善保管登录密码。发现账号异常、设备遗失或疑似信息泄露时，应立即联系项目管理员处理。",
      "不得尝试绕过权限控制、批量导出与本人工作无关的数据，不得将系统数据用于与本职工作无关的用途。",
    ],
  },
  {
    title: "五、服务变更与终止",
    paragraphs: [
      "公司可根据业务安排、系统升级或合规要求调整服务内容，并尽可能提前通知使用人。",
      "账号在离职、岗位调整、项目结束或严重违反本协议时，公司有权暂停或终止相应权限。",
    ],
  },
  {
    title: "六、其他",
    paragraphs: [
      "本协议未尽事宜，按照公司管理制度、客户合同及相关法律法规执行。",
      "如对本协议有疑问，可通过项目主管或系统管理员反馈。",
    ],
  },
];

const privacySections: Section[] = [
  {
    title: "一、我们收集的信息",
    paragraphs: [
      "运营者：上海申汰实业有限公司。我们仅在取得你的明确同意后，收集下列与现场服务相关的信息。",
      "账号与身份信息：账号、姓名、角色、手机号及所属项目，用于身份识别、任务分派和权限控制。",
      "现场作业信息：作业单、客户与门店信息、服务地址、勘测记录、封堵记录、材料用量、服务时间和报告内容。",
      "位置信息：仅当你主动点击“到达现场签到”或“现场签到”时，我们通过微信位置接口获取精确位置（经纬度、定位精度）和签到时间，用于核验是否到达任务指定的客户门店并生成现场考勤签到记录。我们不会在后台或未点击签到时获取位置，不进行持续定位、轨迹追踪、附近门店推荐或广告用途。",
      "影像与签字信息：现场照片、手写签字图片、签字人姓名及签字时间，用于记录服务过程、生成报告和客户确认。",
      "设备与日志信息：为保障系统安全和排查故障，系统会记录必要的登录时间、操作记录、网络请求和错误日志。",
    ],
  },
  {
    title: "二、权限使用说明",
    paragraphs: [
      "位置权限：用于现场签到和记录到场位置。拒绝授权将无法完成签到，但不影响查看已分配任务。",
      "相机与相册权限：用于拍摄或选择现场照片、上传签字图片。拒绝授权将无法补充相应影像资料。",
      "存储权限：用于在小程序内保存和打开服务报告文件。",
    ],
  },
  {
    title: "三、信息使用目的",
    paragraphs: [
      "我们仅将上述信息用于现场服务执行、任务派发、报告生成、内部审核、质量追溯、客户交付、费用结算及必要的安全审计。",
      "我们不会出售你的个人信息，也不会将信息用于与现场服务无关的商业推广。",
    ],
  },
  {
    title: "四、信息共享与披露",
    paragraphs: [
      "在完成服务交付所必需的范围内，服务报告及相关影像、签字信息可能提供给客户或其授权代表确认。",
      "公司内部仅向承担项目管理、审核、客服或系统运维职责且具有相应权限的人员提供必要信息。",
      "除法律法规要求、司法机关或监管部门依法调取外，我们不会向无关第三方提供你的个人信息。",
    ],
  },
  {
    title: "五、存储与保护",
    paragraphs: [
      "系统数据存储于公司控制的境内服务器，通过 HTTPS 传输，并按角色限制访问范围。",
      "我们采取访问控制、操作日志和备份等措施保护信息安全。互联网环境不存在绝对安全，请同时妥善保管账号和设备。",
    ],
  },
  {
    title: "六、保存期限",
    paragraphs: [
      "服务记录、报告、签字和影像按照客户合同、公司档案制度及法律法规要求的期限保存。超过保存期限后，我们将按制度删除或匿名化处理。",
    ],
  },
  {
    title: "七、你的权利",
    paragraphs: [
      "你可以通过系统查看本人任务和相关记录；如需更正身份信息、手机号或报告内容，可联系项目管理员处理。",
      "你可以拒绝或撤回位置、相机等权限授权，但相应功能可能无法使用。涉及法定义务或合同约定的记录，需在保存期限届满后处理。",
    ],
  },
  {
    title: "八、授权与同意",
    paragraphs: [
      "登录前，我们会展示《用户服务协议》和本《隐私政策》，只有你主动勾选同意后，登录按钮才可使用，系统才会提交账号和密码进行身份验证。",
      "在使用位置签到、相机/相册等隐私接口前，我们还会通过微信隐私保护指引请求授权。拒绝授权时不会采集对应信息，但签到、拍照或上传功能将无法使用。",
      "你可以在“我的”页面随时重新查看《用户服务协议》和《隐私政策》，也可以通过项目主管或系统管理员联系运营者。",
    ],
  },
  {
    title: "九、政策更新与联系",
    paragraphs: [
      "本政策更新时，我们会在系统内提示。继续使用前，请阅读更新后的内容。",
      "如对个人信息处理有疑问、意见或投诉，可通过项目主管或系统管理员反馈，我们将在合理期限内处理。",
    ],
  },
];

const title = computed(() =>
  type.value === "service" ? "用户服务协议" : "隐私政策",
);
const sections = computed(() =>
  type.value === "service" ? serviceSections : privacySections,
);

onLoad((query) => {
  type.value = query?.type === "privacy" ? "privacy" : "service";
  uni.setNavigationBarTitle({ title: title.value });
});

function goBack() {
  uni.navigateBack({
    fail: () => {
      uni.reLaunch({ url: "/pages/login/index" });
    },
  });
}
</script>

<template>
  <view class="agreement-page">
    <PageHeader :title="title" kicker="申汰 PCO" back />

    <view class="agreement-body">
      <view class="agreement-card card">
        <text class="agreement-title">{{ title }}</text>
        <text class="agreement-date">生效日期：{{ effectiveDate }}</text>

        <view
          v-for="section in sections"
          :key="section.title"
          class="agreement-section"
        >
          <text class="section-title">{{ section.title }}</text>
          <text
            v-for="(paragraph, index) in section.paragraphs"
            :key="`${section.title}-${index}`"
            class="section-copy"
          >
            {{ paragraph }}
          </text>
        </view>

        <text class="agreement-tail">
          上海申汰实业有限公司
        </text>
      </view>

      <button class="agreement-back" @tap="goBack">返回登录</button>
    </view>
  </view>
</template>

<style scoped>
.agreement-page {
  min-height: 100vh;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  background: #f2f6f3;
  color: #1c2b25;
}

.agreement-body {
  padding: 24rpx 28rpx 0;
}

.agreement-card {
  padding: 30rpx 28rpx;
}

.agreement-title {
  display: block;
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.35;
}

.agreement-date {
  display: block;
  margin-top: 10rpx;
  color: #7b8881;
  font-size: 22rpx;
}

.agreement-section {
  margin-top: 30rpx;
}

.section-title {
  display: block;
  margin-bottom: 10rpx;
  color: #176b52;
  font-size: 27rpx;
  font-weight: 700;
  line-height: 1.5;
}

.section-copy {
  display: block;
  margin-top: 8rpx;
  color: #3f4d47;
  font-size: 25rpx;
  line-height: 1.8;
  text-align: justify;
}

.agreement-tail {
  display: block;
  margin-top: 38rpx;
  color: #7b8881;
  font-size: 23rpx;
  text-align: right;
}

.agreement-back {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 28rpx;
  border-radius: 999px;
  background: #103b2d;
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 700;
}

.agreement-page {
  background: #f4f7f5;
}
</style>
