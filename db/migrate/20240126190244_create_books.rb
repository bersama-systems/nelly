class CreateBooks < ActiveRecord::Migration[7.1]
  def change
    create_table :books do |t|
      t.string :title
      t.text :category
      t.integer :price

      t.timestamps
    end
  end
end
