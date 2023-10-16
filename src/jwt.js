import jwt from 'jsonwebtoken'


export function extractUserId(token) {
    const tokenWithoutPrefix = token.replace('Bearer ', '')
    const decodedToken = jwt.decode(tokenWithoutPrefix);
    // 访问 payload 部分
    return decodedToken.sub
}

