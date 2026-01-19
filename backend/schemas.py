"""
Pydantic 数据模型
对应前端 types.ts 定义
"""

from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum
from uuid import UUID


# ============================================
# 枚举类型
# ============================================

class TaskStatus(str, Enum):
    ONGOING = "ongoing"
    REVIEWING = "reviewing"
    COMPLETED = "completed"
    REJECTED = "rejected"


class TransactionType(str, Enum):
    TASK_REWARD = "task_reward"
    REFERRAL_BONUS = "referral_bonus"
    WITHDRAW = "withdraw"
    SYSTEM_BONUS = "system_bonus"
    ADMIN_GIFT = "admin_gift"
    VIP_BONUS = "vip_bonus"


class TransactionStatus(str, Enum):
    SUCCESS = "success"
    PENDING = "pending"
    FAILED = "failed"


class PlatformStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"


class PlatformType(str, Enum):
    DEPOSIT = "deposit"
    REGISTER = "register"
    SHARE = "share"


class AccountType(str, Enum):
    BANK = "bank"
    EWALLET = "ewallet"
    CRYPTO = "crypto"


class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


class AdminRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    EDITOR = "editor"


# ============================================
# 银行账户
# ============================================

class BankAccountBase(BaseModel):
    bank_name: str = Field(..., alias="bankName")
    account_name: str = Field(..., alias="accountName")
    account_number: str = Field(..., alias="accountNumber")
    type: AccountType = AccountType.BANK

    class Config:
        populate_by_name = True


class BankAccountCreate(BankAccountBase):
    pass


class BankAccount(BankAccountBase):
    id: str

    class Config:
        populate_by_name = True
        from_attributes = True


# ============================================
# 交易记录
# ============================================

class TransactionBase(BaseModel):
    type: TransactionType
    amount: float
    description: str
    status: TransactionStatus = TransactionStatus.SUCCESS


class Transaction(TransactionBase):
    id: str
    date: datetime

    class Config:
        from_attributes = True


# ============================================
# 消息
# ============================================

class MessageBase(BaseModel):
    title: str
    content: str
    reward_amount: Optional[float] = Field(None, alias="rewardAmount")


class Message(MessageBase):
    id: str
    date: datetime
    read: bool = False

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )


# ============================================
# 用户任务
# ============================================

class UserTaskBase(BaseModel):
    platform_id: str = Field(..., alias="platformId")
    platform_name: str = Field(..., alias="platformName")
    logo_url: str = Field(..., alias="logoUrl")
    reward_amount: float = Field(..., alias="rewardAmount")


class UserTask(UserTaskBase):
    id: str
    status: TaskStatus = TaskStatus.ONGOING
    start_time: datetime = Field(..., alias="startTime")
    submission_time: Optional[datetime] = Field(None, alias="submissionTime")
    proof_image_url: Optional[str] = Field(None, alias="proofImageUrl")
    reject_reason: Optional[str] = Field(None, alias="rejectReason")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )


# ============================================
# 用户
# ============================================

class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str
    invite_code: Optional[str] = Field(None, alias="inviteCode")

    class Config:
        populate_by_name = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: str
    phone: Optional[str] = None
    balance: float = 0
    currency: str = "Rp"
    total_earnings: float = Field(0, alias="totalEarnings")
    vip_level: int = Field(1, alias="vipLevel")
    referral_code: str = Field(..., alias="referralCode")
    referrer_id: Optional[str] = Field(None, alias="referrerId")
    invited_count: int = Field(0, alias="invitedCount")
    user_tasks: list[UserTask] = Field(default_factory=list, alias="myTasks")

    liked_task_ids: list[str] = Field(default_factory=list, alias="likedTaskIds")
    registration_date: datetime = Field(..., alias="registrationDate")
    bank_accounts: list[BankAccount] = Field(default_factory=list, alias="bankAccounts")
    role: UserRole = UserRole.USER
    messages: list[Message] = Field(default_factory=list)
    transactions: list[Transaction] = Field(default_factory=list)
    theme: Optional[str] = "gold"
    is_banned: bool = Field(False, alias="isBanned")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )


# ============================================
# 平台/任务
# ============================================

class PlatformBase(BaseModel):
    name: str
    logo_url: str = Field(..., alias="logoUrl")
    description: str
    download_link: str = Field(..., alias="downloadLink")
    first_deposit_amount: float = Field(0, alias="firstDepositAmount")
    reward_amount: float = Field(..., alias="rewardAmount")


class Platform(PlatformBase):
    id: str
    name_color: Optional[str] = Field(None, alias="nameColor")
    desc_color: Optional[str] = Field(None, alias="descColor")
    launch_date: str = Field(..., alias="launchDate")
    is_hot: bool = Field(False, alias="isHot")
    is_pinned: bool = Field(False, alias="isPinned")
    remaining_qty: int = Field(0, alias="remainingQty")
    total_qty: int = Field(0, alias="totalQty")
    likes: int = 0
    steps: list[str] = Field(default_factory=list)
    rules: str = ""
    status: PlatformStatus = PlatformStatus.ONLINE
    type: PlatformType = PlatformType.DEPOSIT
    target_countries: list[str] = Field(default_factory=lambda: ["id"], alias="targetCountries")

    class Config:
        populate_by_name = True
        from_attributes = True


# ============================================
# 活动
# ============================================

class ActivityBase(BaseModel):
    title: str
    image_url: str = Field(..., alias="imageUrl")
    content: str
    link: str


class Activity(ActivityBase):
    id: str
    title_color: Optional[str] = Field(None, alias="titleColor")
    active: bool = True
    show_popup: bool = Field(False, alias="showPopup")
    target_countries: list[str] = Field(default_factory=lambda: ["id"], alias="targetCountries")

    class Config:
        populate_by_name = True
        from_attributes = True


# ============================================
# VIP 配置
# ============================================

class VipTier(BaseModel):
    level: int
    threshold: float
    reward: float


# ============================================
# 系统配置
# ============================================

class SystemConfig(BaseModel):
    initial_balance: dict[str, float] = Field(default_factory=dict, alias="initialBalance")
    min_withdraw_amount: dict[str, float] = Field(default_factory=dict, alias="minWithdrawAmount")
    telegram_links: dict[str, str] = Field(default_factory=dict, alias="telegramLinks")
    hype_level: int = Field(5, alias="hypeLevel")
    help_content: str = Field("", alias="helpContent")
    about_content: str = Field("", alias="aboutContent")
    vip_config: dict[str, list[VipTier]] = Field(default_factory=dict, alias="vipConfig")

    model_config = ConfigDict(
        populate_by_name=True
    )


# ============================================
# API 响应模型
# ============================================

class AuthResponse(BaseModel):
    user: UserResponse
    token: Optional[str] = None


class InitialDataResponse(BaseModel):
    platforms: list[Platform]
    activities: list[Activity]


class BindPhoneRequest(BaseModel):
    phone: str


class WithdrawRequest(BaseModel):
    amount: float
    account_id: str = Field(..., alias="accountId")

    model_config = ConfigDict(
        populate_by_name=True
    )


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
