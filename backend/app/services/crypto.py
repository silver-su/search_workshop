"""Base64 編碼 / 解碼工具。

需求說明使用 base64「加密」,實作上即 base64 編碼。
此處集中處理,方便日後替換為更強的加密演算法。
"""
import base64


def b64_encode(plain: str) -> str:
    return base64.b64encode(plain.encode("utf-8")).decode("ascii")


def b64_decode(encoded: str) -> str:
    return base64.b64decode(encoded.encode("ascii")).decode("utf-8")
