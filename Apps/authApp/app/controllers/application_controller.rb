class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception
  respond_to? :json

  def is_authed?
    !request&.headers["AuthApp-SessionId"].blank? && request&.headers["AuthApp-SessionId"].starts_with?("lolsecurity")
  end
end
