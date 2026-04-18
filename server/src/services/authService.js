const bcrypt = require('bcryptjs');
const prismaClient = require('../configs/db');
const AppError = require('../utils/AppError');


async function registerUser(name, username, email, password) {

    // check if username or email is taken
    const existingUser = await isUsernameOrEmailTaken(username, email);
    if (existingUser) {
        throw new AppError('Username or email is already taken', 409);
    }

    // hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // create user in database
    const user = await prismaClient.user.create({
        data: {
            name,
            username,
            email,
            password: hashedPassword
        }
    });

    // return user without password
    const { password: _, ...safeUser } = user;
    return safeUser;

}

async function isUsernameOrEmailTaken(username, email) {
    const user = await prismaClient.user.findFirst({
        where: {
            OR: [
                { username: username },
                { email: email }
            ]
        }
    });
    return user !== null;
}


async function loginUser(email, password) {
    // find user by email
    const user = await getUserByEmail(email);

    // email not available
    if (!user) {
        // for constant time response to prevent timing attacks
        await bcrypt.compare(password, '$2b$10$fakehashfakehashfakehashfakehash');
        throw new AppError('Invalid email or password', 401);
    }


    if (await bcrypt.compare(password, user.password)) {
        const { password: _, ...safeUser } = user;
        return safeUser;
    }

    throw new AppError('Invalid email or password', 401);

}


async function getUserByEmail(email) {
    return await prismaClient.user.findUnique({
        where: { email: email }
    });
}



module.exports = {
    registerUser,
    loginUser
};
