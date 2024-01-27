class ApplicationController < ActionController::Base
  protect_from_forgery unless: -> { request.format.json? }
  respond_to? :json

  def is_authed?
    !request&.headers["AuthApp-SessionId"].blank? && request&.headers["AuthApp-SessionId"].starts_with?("lolsecurity")
  end

  def has_account?
    !account.blank?
  end

  def account
    request&.headers["AuthApp-AccountId"]
  end
end
