import db from "./index.js"

const schema = new db.Schema(
    {
        seriral_number: { type: Number, default: null },
        primise_name: { type: String, default: null },
        county: { type: String, default: null },
        type: { type: String, default: null },
    },
    { timestamps: true }
)


schema.method("toJSON", function () {
    const { __v, _id, ...object } = this.toObject()
    object.id = _id
    return object
})


const Distributor = db.model("distributor", schema)


export { Distributor }
