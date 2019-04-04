const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('express-jwt');

const userRepository = require('./repositories/userRepository').instance;
const commentRepository = require('./repositories/commentRepository').instance;
const communityRepository = require('./repositories/communityRepository').instance;
const postRepository = require('./repositories/postRepository').instance;
const voteRepository = require('./repositories/voteRepository').instance;

const createAuthTokensRouter = require('./routers/authTokens');
const createUserRouter = require('./routers/users');
const createCommunityRouter = require('./routers/communities');
const createPostRouter = require('./routers/posts');
const createCommentRouter = require('./routers/comments');
const jwtErrorHandler = require('./middlewares/jwtErrorHandler');
const repositoryErrorHandler = require('./middlewares/repositoryErrorHandler');
const authorizationHandler = require('./middlewares/authoriztionHandler');

const port = process.env.port || 3000;
const secret = process.env.JWT_SECRET_KEY;

/* ----------------------------- create routers ----------------------------- */
const authTokensRouter = createAuthTokensRouter({ userRepository, secret });
const commentRouter = createCommentRouter({ commentRepository });
const communityRouter = createCommunityRouter({ communityRepository, postRepository });
const postRouter = createPostRouter({ postRepository, commentRepository, voteRepository });
const usersRouter = createUserRouter({ userRepository });

/* ---------------------------- init application ---------------------------- */
const app = express();
app.listen(port, () => {
  console.log(`listening port ${port}`);
});

/* --------------------- register pre-router middlewares -------------------- */
app.use(bodyParser.json());
app.use(jwt({ secret, credentialsRequired: false })); // if auth token exists, add req.user
app.use(authorizationHandler.unless({
  method: ['GET'],
  path: [
    { url: '/users', methods: ['POST'] },
    { url: '/authTokens', methods: ['POST'] },
  ],
}));

/* ---------------------------- register routers ---------------------------- */
app.use('/users', usersRouter);
app.use('/authTokens', authTokensRouter);
app.use('/communities', communityRouter);
app.use('/posts', postRouter);
app.use('/comments', commentRouter);

app.get('/hello/:name', (req, res) => {
  res.status(200).send(`hello ${req.params.name}`);
});

/* ---------------------- register post error handlers ---------------------- */
app.use(jwtErrorHandler);
app.use(repositoryErrorHandler);

module.exports = app;
