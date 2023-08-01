import db from "./index.js"

const schema = new db.Schema(
    {
        name: { type: String, required: true },
        distributors: { type: Array, default: [] },
    },
    { timestamps: true }
)


schema.method("toJSON", function () {
    const { __v, _id, ...object } = this.toObject()
    object.id = _id
    return object
})


const PriceType = db.model("type", schema)


export { PriceType }
