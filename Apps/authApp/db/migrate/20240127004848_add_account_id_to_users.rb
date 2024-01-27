class AddAccountIdToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :account_id, :string
  end
end
