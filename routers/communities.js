const express = require('express');
const communityRepository = require('../repositories/communityRepository').instance;
const postRepository = require('../repositories/postRepository').instance;
const { validate } = require('../middlewares/valiationHandler');
const schemas = require('../validation/schemas');

const router = express.Router();

router.post('/', validate(schemas.newCommunity), (req, res, next) => communityRepository.create(req.body)
  .then(community => res.status(201).json(community))
  .catch(error => next(error)));

router.post('/:communityName/posts/', validate(schemas.newPost), (req, res, next) => {
  req.body.authorId = req.user.userId;
  req.body.communityName = req.params.communityName;
  return postRepository.createUnder(req.params.communityName, req.body)
    .then(posted => res.status(201).json(posted))
    .catch(error => next(error));
});

router.get('/:communityName/posts/', validate(schemas.queryOptions), (req, res, next) => postRepository.findUnder(req.params.communityName, req.query)
  .then(results => res.status(200).json(results))
  .catch(error => next(error)));
module.exports = router;
