const GenericRepository = require('./genericRepository');
const { IdentityNotFoundError, isForeignKeyError, EntityNotFoundError } = require('./errors');

const queryPostSql = `SELECT Post.postId, Post.title, Post.authorId,
                             Community.communityId, Community.communityName,
                             (SELECT CAST(IFNULL(SUM(Vote.value), 0) AS SIGNED) FROM Vote WHERE Vote.postId = Post.postId) as votes,
                             (SELECT COUNT(*) FROM Comment WHERE Comment.postId = Post.postId) as comments,
                             Post.updatedAt, Post.createdAt
                        FROM Post
                       INNER JOIN Community
                          ON Post.communityId = Community.communityId`;

/**
 * @class Construct a post repository
 * @param {Object} postModel Set up model to access resources.
 */
class PostRepository extends GenericRepository {
  /**
   * Create a post under in given community.
   * @param {string} communityName
   * @param {object} post
   * @returns {Promise<object>} { postId }
   */
  createUnder(communityName, post) {
    const { sequelize } = this.sequelizeModel;
    const now = new Date();
    const replacements = Object.assign({ }, post);
    replacements.communityName = communityName;
    replacements.createdAt = now;
    replacements.updatedAt = now;
    const sql = `INSERT INTO 
                   Post (communityId, title, content, authorId, createdAt, updatedAt)
                 SELECT communityId, :title, :content, :authorId, :createdAt, updatedAt
                   FROM  Community WHERE communityName = :communityName;`;

    return sequelize.query(sql, {
      replacements,
      type: sequelize.QueryTypes.INSERT,
    }).then((results) => {
      if (results[1] === 0) { // communityName is not found
        return Promise.reject(new IdentityNotFoundError({ community: communityName }));
      }
      [replacements.postId] = results;
      return replacements;
    }).catch((error) => {
      if (isForeignKeyError(error)) {
        throw new IdentityNotFoundError({ authorId: replacements.authorId });
      }
      throw error;
    });
  }

  /**
   * @param {string} communityName Find the posts of the community, if communityName is null,
   *  find posts without considering the community.
   * @param {object} [options={}]
   * @param {number} [options.offset=0]
   * @param {number} [options.limit=20]
   * @param {string} [options.sort=new]
   * @param {string} [options.search]
   */
  findUnder(communityName, options = {}) {
    const replacements = Object.assign({
      offset: 0,
      limit: 20,
      sort: 'new',
    }, options);

    const sqlTrunks = [queryPostSql];

    if (communityName) {
      sqlTrunks.push('AND Community.communityName = :communityName');
      replacements.communityName = communityName;
    }

    if (options.search) {
      replacements.search = `%${replacements.search}%`;
      sqlTrunks.push('AND Post.title LIKE :search');
    }

    switch (options.sort) {
      case 'new':
        sqlTrunks.push('ORDER BY Post.UpdatedAt DESC');
        break;
      case 'best':
        sqlTrunks.push('ORDER BY Votes DESC');
        break;
      case 'hot':
        sqlTrunks.push('ORDER BY Post.UpdatedAt DESC, Votes DESC');
        break;
      default:
        sqlTrunks.push('ORDER BY Post.UpdatedAt DESC');
        break;
    }
    sqlTrunks.push('LIMIT :limit OFFSET :offset');

    return this.sequelizeModel.sequelize.query(sqlTrunks.join(' '), {
      replacements,
      type: this.sequelizeModel.sequelize.QueryTypes.SELECT,
    });
  }

  findById(postId) {
    const sqlTrunks = [queryPostSql];
    sqlTrunks.push('WHERE Post.postId = :postId');

    return this.sequelizeModel.sequelize.query(sqlTrunks.join(' '), {
      replacements: { postId },
      type: this.sequelizeModel.sequelize.QueryTypes.SELECT,
    }).then((posts) => {
      if (posts && posts.length === 1) {
        return Promise.resolve(posts[0]);
      }
      return Promise.reject(new EntityNotFoundError());
    });
  }
}

module.exports.PostRepository = PostRepository;
