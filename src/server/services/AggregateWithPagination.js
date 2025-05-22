const mongoose = require("mongoose");
const moment = require("moment-timezone");
const objectId = mongoose.Types.ObjectId.createFromHexString;

class CommonAggregation {
  constructor(params = { Model, pipeline, query }) {
    let {
      limit,
      page,
      sortKey,
      sortOrder,
      searchString,
      searchKeys,
      filterData,
      tz,
    } = params.query;

    this.Model = params.Model;

    let sort = {};
    let filters = [];
    if (sortKey) {
      if (typeof sortKey === "string") {
        sort[sortKey] = sortOrder === "ASC" ? -1 : 1;
      }
    }
    if (!Object.keys(sort).length) {
      sort.createdAt = -1;
    }

    this.sort = sort;

    if (searchString && searchKeys && JSON.parse(searchKeys).length) {
      const searchQuery = [];
      searchKeys = JSON.parse(searchKeys);

      searchKeys.map((key) => {
        searchQuery.push({
          [key]: { $regex: new RegExp("^" + searchString.toLowerCase(), "i") },
        });
      });

      pipeline.push({
        $match: { $or: searchQuery },
      });
    }

    filterData = filterData && JSON.parse(filterData);

    if (filterData) {
      for (let filterKey in filterData) {
        if (
          filterData[filterKey]["fromDate"] ||
          filterData[filterKey]["toDate"]
        ) {
          filters.push({
            $match: {
              [filterKey]: {
                $gte: moment(filterData[filterKey]["fromDate"])
                  .tz(tz)
                  .startOf("day")
                  .utc()
                  .toDate(),
                $lte: moment(filterData[filterKey]["toDate"])
                  .tz(tz)
                  .endOf("day")
                  .utc()
                  .toDate(),
              },
            },
          });
        } else if (
          Array.isArray(filterData[filterKey]) &&
          filterData[filterKey].length
        ) {
          const isObjectId = filterData[filterKey].some((item) =>
            mongoose.Types.ObjectId.isValid(item)
          );
          if (isObjectId) {
            filters.push({
              $match: {
                [`${filterKey}._id`]: {
                  $in: filterData[filterKey].map((item) => objectId(item)),
                },
              },
            });
          } else {
            filters.push({
              $match: {
                $expr: {
                  $regexMatch: {
                    input: { $toString: `$${filterKey}` },
                    regex: new RegExp(
                      "^" + filterData[filterKey].toString().toLowerCase(),
                      "i"
                    ),
                  },
                },
              },
            });
          }
        } else {
          const searchValue = filterData[filterKey].toString().toLowerCase();
          console.log(typeof searchValue);

          filters.push({
            $match: {
              $or: [
                ...(typeof filterData[filterKey] === 'boolean'
                  ? [{ [filterKey]: filterData[filterKey] }]
                  : !isNaN(filterData[filterKey])
                  ? [{ [filterKey]: Number(filterData[filterKey]) }]
                  : []),
                {
                  [filterKey]: {
                    $regex: new RegExp("^" + searchValue, "i"),
                  },
                },
              ],
            },
          });
        }
      }
    }

    this.limit = limit ? Number.parseInt(limit) : 0;
    this.page = page ? Number.parseInt(page) : 1;

    this.pagination = [];
    this.limit = this.limit ?? 0;
    this.pipeline = params.pipeline ?? [];

    if (this.page) {
      this.pagination.push({ $skip: (this.page - 1) * this.limit });
    }
    if (this.limit) {
      this.pagination.push({ $limit: this.limit });
    }

    if (this.sort) {
      this.pipeline.push({ $sort: this.sort });
    }
    if (filters.length) {
      this.pipeline.push(...filters);
    }
  }

  async getAggregateWithPagination() {
    const [result] = await this.Model.aggregate([
      ...this.pipeline,
      {
        $facet: {
          metadata: [{ $count: "total" }, { $addFields: { page: this.page } }],
          data: this.pagination,
        },
      },
    ]);

    if (this.limit === 0) {
      this.limit = result.metadata[0]?.total;
    }
    const pagination = {
      total: result.metadata[0]?.total ?? 0,
      totalPages: result.metadata[0]?.total
        ? Math.ceil(result.metadata[0]?.total / this.limit)
        : 0,
      page: this.page,
      limit: result.data.length,
    };

    // Convert to Model instance to get virtual fields
    const data = result.data.map((d) => {
      return { ...new this.Model(d).toObject(), ...d };
    });

    return { pagination, list: data };
  }

  async getAggregateWithoutPagination() {
    return await this.Model.aggregate([...this.pipeline]);
  }

  async getAggregateLeanData() {
    const [result] = await this.Model.aggregate([
      ...this.pipeline,
      {
        $facet: {
          metadata: [{ $count: "total" }, { $addFields: { page: this.page } }],
          data: this.pagination,
        },
      },
    ]);

    if (this.limit === 0) {
      this.limit = result.metadata[0]?.total;
    }
    const pagination = {
      total: result.metadata[0]?.total ?? 0,
      totalPages: result.metadata[0]?.total
        ? Math.ceil(result.metadata[0]?.total / this.limit)
        : 0,
      page: this.page,
      limit: result.data.length,
    };

    return { pagination, data: result.data };
  }
}

module.exports = CommonAggregation;
