"""
Configuration management for OpenCode Monitor
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置"""
    
    # 数据库配置
    DATABASE_URL: str = "sqlite:///./data/events.db"
    
    # API 配置
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 7000
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


# 全局配置实例
settings = Settings()