import db from "./index.js"

const schema = new db.Schema(
    {
        brand_reg: { type: String, default: '' },
        brand_name: { type: String, default: '' },
        type: { type: String, default: '' },
        selected_type: { type: String, default: '' },

        item: { type: String, default: '' },
        size: { type: Number, default: 0 },

        discounts: { type: Array, default: [] },
        discount_formatted: { type: String, default: '' },


        per_bottle: { type: Number, default: 0 },
        per_case: { type: Number, default: 0 },
        bot_per_case: { type: Number, default: 0 },
        // The id from nsn website
        item_id: { type: Number, default: 0 },

        distributor_serial: { type: Number, default: 0 },
        distributor_name: { type: String, default: '' },
        distributor_county: { type: String, default: '' },

        page: { type: Number, default: 1 },

    },
    { timestamps: true }
)


schema.method("toJSON", function () {
    const { __v, _id, ...object } = this.toObject()
    object.id = _id
    return object
})


const Price = db.model("price", schema)


export { Price }
